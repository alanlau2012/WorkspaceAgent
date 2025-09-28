/**
 * @jest-environment node
 */

const handlers = {}
const mockReadFile = jest.fn()

jest.mock('fs/promises', () => ({
  readFile: (...args) => mockReadFile(...args),
  stat: jest.fn(async () => ({ size: 10 }))
}))

jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn((channel, handler) => {
      handlers[channel] = handler
    })
  }
}))

describe('registerIpcHandlers', () => {
  beforeEach(() => {
    jest.resetModules()
    Object.keys(handlers).forEach(key => delete handlers[key])
  })

  it('注册read-file处理函数并读取文件内容', async () => {
    // 运行期 spy 核心 fs 的 promises.stat，避免真实文件访问
    const fsCore = require('fs')
    jest.spyOn(fsCore.promises, 'stat').mockResolvedValue({ size: 10 })

    const { registerIpcHandlers } = require('../ipcHandlers')

    mockReadFile.mockResolvedValue('mock content')

    registerIpcHandlers()

    expect(handlers['read-file']).toBeDefined()

    const result = await handlers['read-file'](null, '/mock/path.txt')

    expect(mockReadFile).toHaveBeenCalledWith('/mock/path.txt', 'utf-8')
    expect(result).toBe('mock content')
  })
})

