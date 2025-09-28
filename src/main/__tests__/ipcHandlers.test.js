/**
 * @jest-environment node
 */

const handlers = {}
const mockReadFile = jest.fn()

jest.mock('fs/promises', () => ({
  readFile: (...args) => mockReadFile(...args)
}))

jest.mock('electron', () => {
  const original = jest.requireActual('electron')

  return {
    ...original,
    ipcMain: {
      handle: jest.fn((channel, handler) => {
        handlers[channel] = handler
      })
    }
  }
})

describe('registerIpcHandlers', () => {
  beforeEach(() => {
    jest.resetModules()
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
})

