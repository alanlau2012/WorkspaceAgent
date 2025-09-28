/**
 * @jest-environment node
 */

const handlers = {}
const mockReadFile = jest.fn()
const mockStat = jest.fn()
const mockOpen = jest.fn()

jest.mock('fs/promises', () => ({
  readFile: (...args) => mockReadFile(...args),
  stat: (...args) => mockStat(...args),
  open: (...args) => mockOpen(...args)
}))

jest.mock('mime-types', () => ({
  lookup: jest.fn(() => 'text/plain')
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
    jest.clearAllMocks()
  })

  it('注册read-file处理函数并读取文件内容', async () => {
    const { registerIpcHandlers } = require('../ipcHandlers')

    const mockContent = 'mock content'
    const mockSize = 100
    
    mockStat.mockResolvedValue({ size: mockSize })
    mockReadFile.mockResolvedValue(mockContent)

    registerIpcHandlers()

    expect(handlers['read-file']).toBeDefined()

    const result = await handlers['read-file'](null, '/mock/path.txt')

    expect(mockStat).toHaveBeenCalledWith('/mock/path.txt')
    expect(mockReadFile).toHaveBeenCalledWith('/mock/path.txt', 'utf-8')
    expect(result).toEqual({
      type: 'text',
      content: mockContent,
      size: mockSize
    })
  })
})

