/**
 * @jest-environment node
 */

const handlers = {}

const mockTrashItem = jest.fn()
const mockFs = {
  rm: jest.fn(),
  rename: jest.fn()
}

jest.mock('fs/promises', () => mockFs)

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
    }
  }
})

describe('ipcHandlers 文件操作', () => {
  beforeEach(() => {
    jest.resetModules()
    Object.keys(handlers).forEach(k => delete handlers[k])
    mockTrashItem.mockReset()
    mockFs.rm.mockReset()
    mockFs.rename.mockReset()
  })

  it('delete-path 使用 shell.trashItem', async () => {
    const { registerIpcHandlers } = require('../ipcHandlers')
    mockTrashItem.mockResolvedValue(true)

    registerIpcHandlers()
    expect(handlers['delete-path']).toBeDefined()

    const target = '/tmp/mock.txt'
    const res = await handlers['delete-path'](null, target)

    expect(mockTrashItem).toHaveBeenCalledWith(target)
    expect(res).toBe(true)
    expect(mockFs.rm).not.toHaveBeenCalled()
  })

  it('delete-path 回收站失败时 fallback 到 fs.rm', async () => {
    const { registerIpcHandlers } = require('../ipcHandlers')
    mockTrashItem.mockRejectedValue(new Error('not supported'))
    mockFs.rm.mockResolvedValue()

    registerIpcHandlers()
    const target = '/tmp/mock2.txt'
    const res = await handlers['delete-path'](null, target)

    expect(mockTrashItem).toHaveBeenCalledWith(target)
    expect(mockFs.rm).toHaveBeenCalledWith(target, { recursive: true, force: true })
    expect(res).toEqual({ trashed: false, deleted: true })
  })

  it('rename-path 使用 fs.rename 并基于新名称构造路径', async () => {
    const { registerIpcHandlers } = require('../ipcHandlers')
    mockFs.rename.mockResolvedValue()

    registerIpcHandlers()

    const oldPath = '/home/user/docs/file.txt'
    const newName = 'new.txt'
    const result = await handlers['rename-path'](null, oldPath, newName)

    expect(mockFs.rename).toHaveBeenCalled()
    expect(result).toEqual({ ok: true })
  })
})

