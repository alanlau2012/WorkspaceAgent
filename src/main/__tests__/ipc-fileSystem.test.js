/**
 * @jest-environment node
 */

const handlers = {}

describe('fileSystem IPC', () => {
  let dialog
  let chokidar
  let buildFSTree
  let windows

  beforeEach(() => {
    jest.resetModules()
    Object.keys(handlers).forEach(k => delete handlers[k])

    dialog = { showOpenDialog: jest.fn() }
    buildFSTree = jest.fn()

    const eventCallbacks = {}
    const fakeWatcher = {
      on: jest.fn((evt, cb) => { eventCallbacks[evt] = cb; return fakeWatcher }),
      close: jest.fn()
    }
    chokidar = { watch: jest.fn(() => fakeWatcher), __events: eventCallbacks, __watcher: fakeWatcher }

    windows = [{ webContents: { send: jest.fn() } }]

    const { registerFileSystemIpc } = require('../ipc/fileSystem')

    // 手工模拟 ipcMain.handle 注册
    const ipcMain = {
      handle: jest.fn((channel, handler) => { handlers[channel] = handler })
    }

    registerFileSystemIpc({
      ipcMain,
      dialog,
      chokidar,
      buildFSTree,
      getBrowserWindows: () => windows
    })
  })

  it('select-directory：调用系统对话框并返回构建的目录树', async () => {
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/root'] })
    buildFSTree.mockResolvedValue([{ name: 'README.md', type: 'file', path: '/root/README.md' }])

    const result = await handlers['select-directory']({})

    expect(dialog.showOpenDialog).toHaveBeenCalled()
    expect(buildFSTree).toHaveBeenCalledWith('/root', {})
    expect(result).toEqual({ rootPath: '/root', tree: [{ name: 'README.md', type: 'file', path: '/root/README.md' }] })
  })

  it('watch-directory/stop-watching：创建 watcher 并在事件时广播 file-changed', async () => {
    await handlers['watch-directory']({}, '/root')

    // 触发 change 事件
    chokidar.__events['all'] && chokidar.__events['all']('change', '/root/a.js')
    expect(windows[0].webContents.send).toHaveBeenCalledWith('file-changed', { event: 'change', path: '/root/a.js' })

    await handlers['stop-watching']({})
    expect(chokidar.__watcher.close).toHaveBeenCalled()
  })

  it('write-file：写入内容成功返回 ok', async () => {
    const mockWrite = jest.fn().mockResolvedValue(undefined)

    const { registerFileSystemIpc } = require('../ipc/fileSystem')

    const ipcMain = { handle: jest.fn((c, h) => { handlers[c] = h }) }

    registerFileSystemIpc({
      ipcMain,
      dialog,
      chokidar,
      buildFSTree,
      getBrowserWindows: () => windows,
      fs: { writeFile: (...args) => mockWrite(...args), readFile: jest.fn() }
    })

    const res = await handlers['write-file']({}, '/root/a.txt', 'hello')
    expect(mockWrite).toHaveBeenCalledWith('/root/a.txt', 'hello', 'utf-8')
    expect(res).toEqual({ status: 'ok' })
  })
})

