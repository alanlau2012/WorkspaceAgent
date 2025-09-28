const path = require('path')

jest.mock('electron', () => {
  const handlers = new Map()
  return {
    ipcMain: {
      handle: (channel, handler) => {
        handlers.set(channel, handler)
      }
    },
    dialog: {
      showOpenDialog: jest.fn()
    },
    __handlers: handlers
  }
})

jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  mkdir: jest.fn(),
  rename: jest.fn(),
  rm: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn()
}))

describe('registerIpcHandlers (filesystem IPC)', () => {
  const electron = require('electron')
  let fs
  let handlers

  beforeEach(() => {
    // Clear previous handlers and mocks
    electron.__handlers.clear()
    jest.resetModules()
    jest.clearAllMocks()
    // Re-require module to re-register handlers
    require('../ipcHandlers').registerIpcHandlers()
    handlers = require('electron').__handlers
    fs = require('fs/promises')
  })

  test('create-folder calls fs.mkdir recursive', async () => {
    fs.mkdir.mockResolvedValue(undefined)
    const result = await handlers.get('create-folder')(null, 'C:/tmp/newdir')
    expect(fs.mkdir).toHaveBeenCalledWith('C:/tmp/newdir', { recursive: true })
    expect(result).toBe(true)
  })

  test('write-file writes content and returns true', async () => {
    fs.writeFile.mockResolvedValue(undefined)
    const ok = await handlers.get('write-file')(null, 'C:/a.txt', 'hello')
    expect(fs.writeFile).toHaveBeenCalledWith('C:/a.txt', 'hello')
    expect(ok).toBe(true)
  })

  test('rename-path builds new path and renames', async () => {
    fs.rename.mockResolvedValue(undefined)
    const oldPath = path.join('C:', 'work', 'old.txt')
    const ok = await handlers.get('rename-path')(null, oldPath, 'new.txt')
    expect(fs.rename).toHaveBeenCalledWith(oldPath, path.join(path.dirname(oldPath), 'new.txt'))
    expect(ok).toBe(true)
  })

  test('delete-path removes recursively', async () => {
    fs.rm.mockResolvedValue(undefined)
    const ok = await handlers.get('delete-path')(null, 'C:/tmp/remove-me')
    expect(fs.rm).toHaveBeenCalledWith('C:/tmp/remove-me', { recursive: true, force: true })
    expect(ok).toBe(true)
  })

  test('read-file returns content', async () => {
    fs.readFile.mockResolvedValue('content')
    const text = await handlers.get('read-file')(null, 'C:/a.txt')
    expect(fs.readFile).toHaveBeenCalledWith('C:/a.txt', 'utf-8')
    expect(text).toBe('content')
  })

  test('select-directory returns [] when canceled', async () => {
    const { dialog } = require('electron')
    dialog.showOpenDialog.mockResolvedValue({ canceled: true })
    const res = await handlers.get('select-directory')(null)
    expect(res).toEqual([])
  })

  test('select-directory returns {rootPath, entries}', async () => {
    const { dialog } = require('electron')
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['C:/root'] })

    const dirItem = (name, isDir) => ({ name, isDirectory: () => isDir })
    // root has folder "sub" and file "a.txt"
    fs.readdir.mockImplementation(async (dir, opts) => {
      if (dir === 'C:/root') return [dirItem('sub', true), dirItem('a.txt', false)]
      if (dir === path.join('C:/root', 'sub')) return []
      throw new Error('unexpected path ' + dir)
    })

    const res = await handlers.get('select-directory')(null)
    expect(res.rootPath).toBe('C:/root')
    expect(Array.isArray(res.entries)).toBe(true)
    const names = res.entries.map(e => e.name).sort()
    expect(names).toEqual(['a.txt', 'sub'])
    const sub = res.entries.find(e => e.name === 'sub')
    expect(sub.type).toBe('directory')
    expect(Array.isArray(sub.children)).toBe(true)
  })

  test('read-directory lists children for a given path', async () => {
    const dirItem = (name, isDir) => ({ name, isDirectory: () => isDir })
    fs.readdir.mockImplementation(async (dir, opts) => {
      if (dir === 'C:/data') return [dirItem('x', false), dirItem('y', true)]
      if (dir === path.join('C:/data', 'y')) return []
      return []
    })
    const list = await handlers.get('read-directory')(null, 'C:/data')
    const names = list.map(e => e.name).sort()
    expect(names).toEqual(['x', 'y'])
  })
})

