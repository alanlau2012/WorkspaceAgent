/**
 * @jest-environment node
 */

const handlers = {}
const mockReadFile = jest.fn()
const mockTrashItem = jest.fn()
const mockRm = jest.fn()

const mockRename = jest.fn()

jest.mock('fs/promises', () => ({
  readFile: (...args) => mockReadFile(...args),
  writeFile: (...args) => mockRm(...args),
  rm: (...args) => mockRm(...args),
  rename: (...args) => mockRename(...args)
}))

jest.mock('electron', () => {
  const original = jest.requireActual('electron')

  return {
    ...original,
    ipcMain: {
      handle: jest.fn((channel, handler) => {
        handlers[channel] = handler
      })
    },
    shell: {
      trashItem: (...args) => mockTrashItem(...args)
    },
    dialog: {
      showOpenDialog: jest.fn()
    }
  }
})

describe('registerIpcHandlers', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    mockRename.mockClear()
    Object.keys(handlers).forEach(key => delete handlers[key])
  })

  it('注册read-file处理函数并读取文件内容', async () => {
    const { registerIpcHandlers } = require('../ipcHandlers')

    mockReadFile.mockResolvedValue('mock content')

    registerIpcHandlers()

    expect(handlers['read-file']).toBeDefined()

    const result = await handlers['read-file'](null, '/mock/path.txt')

    expect(mockReadFile).toHaveBeenCalledWith('/mock/path.txt', 'utf-8')
    expect(result).toBe('mock content')
  })

  it('注册delete-path处理函数并使用回收站删除', async () => {
    const { registerIpcHandlers } = require('../ipcHandlers')

    mockTrashItem.mockResolvedValue(true)

    registerIpcHandlers()

    expect(handlers['delete-path']).toBeDefined()

    const result = await handlers['delete-path'](null, '/mock/path')

    expect(mockTrashItem).toHaveBeenCalledWith('/mock/path')
    expect(result).toEqual({ success: true, method: 'trash' })
  })

  it('delete-path在回收站失败时回退到永久删除', async () => {
    const { registerIpcHandlers } = require('../ipcHandlers')

    mockTrashItem.mockRejectedValue(new Error('回收站不可用'))
    mockRm.mockResolvedValue(true)

    registerIpcHandlers()

    const result = await handlers['delete-path'](null, '/mock/path')

    expect(mockTrashItem).toHaveBeenCalledWith('/mock/path')
    expect(mockRm).toHaveBeenCalledWith('/mock/path', { recursive: true, force: true })
    expect(result).toEqual({ success: true, method: 'permanent' })
  })

  it('delete-path在所有删除方法都失败时返回错误', async () => {
    const { registerIpcHandlers } = require('../ipcHandlers')

    mockTrashItem.mockRejectedValue(new Error('回收站不可用'))
    mockRm.mockRejectedValue(new Error('永久删除失败'))

    registerIpcHandlers()

    const result = await handlers['delete-path'](null, '/mock/path')

    expect(result).toEqual({ success: false, error: '永久删除失败' })
  })

  it('注册rename-path处理函数并重命名文件', async () => {
    const { registerIpcHandlers } = require('../ipcHandlers')

    mockRename.mockResolvedValue(true)

    registerIpcHandlers()

    expect(handlers['rename-path']).toBeDefined()

    const result = await handlers['rename-path'](null, '/old/path/file.txt', 'newfile.txt')

    expect(mockRename).toHaveBeenCalledWith('/old/path/file.txt', '/old/path/newfile.txt')
    expect(result).toEqual({ success: true })
  })

  it('rename-path在重命名失败时返回错误', async () => {
    const { registerIpcHandlers } = require('../ipcHandlers')

    mockRename.mockRejectedValue(new Error('重命名失败'))

    registerIpcHandlers()

    const result = await handlers['rename-path'](null, '/old/path/file.txt', 'newfile.txt')

    expect(result).toEqual({ success: false, error: '重命名失败' })
  })

  it('注册read-children处理函数并返回目录子项', async () => {
    const { registerIpcHandlers } = require('../ipcHandlers')

    const mockReaddir = jest.fn().mockResolvedValue([
      { name: 'file1.txt', isDirectory: () => false },
      { name: 'folder1', isDirectory: () => true }
    ])

    // 重新mock fs/promises
    jest.resetModules()
    jest.doMock('fs/promises', () => ({
      readFile: (...args) => mockReadFile(...args),
      writeFile: (...args) => mockRm(...args),
      rm: (...args) => mockRm(...args),
      rename: (...args) => mockRename(...args),
      readdir: (...args) => mockReaddir(...args)
    }))

    const { registerIpcHandlers: registerHandlers } = require('../ipcHandlers')
    registerHandlers()

    expect(handlers['read-children']).toBeDefined()

    const result = await handlers['read-children'](null, '/test/dir')

    expect(mockReaddir).toHaveBeenCalledWith('/test/dir', { withFileTypes: true })
    expect(result).toEqual([
      {
        name: 'file1.txt',
        path: '/test/dir/file1.txt',
        isDirectory: false,
        children: undefined
      },
      {
        name: 'folder1',
        path: '/test/dir/folder1',
        isDirectory: true,
        children: []
      }
    ])
  })

  it('read-children在读取失败时返回错误', async () => {
    const { registerIpcHandlers } = require('../ipcHandlers')

    const mockReaddir = jest.fn().mockRejectedValue(new Error('读取目录失败'))

    // 重新mock fs/promises
    jest.resetModules()
    jest.doMock('fs/promises', () => ({
      readFile: (...args) => mockReadFile(...args),
      writeFile: (...args) => mockRm(...args),
      rm: (...args) => mockRm(...args),
      rename: (...args) => mockRename(...args),
      readdir: (...args) => mockReaddir(...args)
    }))

    const { registerIpcHandlers: registerHandlers } = require('../ipcHandlers')
    registerHandlers()

    const result = await handlers['read-children'](null, '/test/dir')

    expect(result).toEqual({ success: false, error: '读取目录失败' })
  })
})

