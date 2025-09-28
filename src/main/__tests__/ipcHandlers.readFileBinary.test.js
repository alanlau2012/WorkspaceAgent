/** @jest-environment node */
const path = require('path')

// Mock dependencies
const mockFs = { 
  readFile: jest.fn(), 
  stat: jest.fn(), 
  open: jest.fn()
}

const mockIpcMain = {
  handle: jest.fn()
}

const handlers = {}

jest.mock('fs/promises', () => ({
  readFile: (...args) => mockFs.readFile(...args),
  stat: (...args) => mockFs.stat(...args),
  open: (...args) => mockFs.open(...args),
}))

jest.mock('electron', () => ({ 
  ipcMain: { 
    handle: (channel, handler) => {
      handlers[channel] = handler
      return mockIpcMain.handle(channel, handler)
    }
  } 
}))

jest.mock('mime-types', () => ({
  lookup: jest.fn((ext) => {
    const mimes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg', 
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml'
    }
    return mimes[ext] || 'application/octet-stream'
  })
}))

describe('read-file binary support', () => {
  let registerIpcHandlers

  beforeEach(() => {
    Object.keys(handlers).forEach(k => delete handlers[k])
    jest.resetModules()
    jest.clearAllMocks()
    
    // Import after mocks are set up
    registerIpcHandlers = require('../../main/ipcHandlers').registerIpcHandlers
  })

  it('图片返回 data URL', async () => {
    mockFs.stat.mockResolvedValue({ size: 100 })
    mockFs.readFile.mockResolvedValue(Buffer.from('fake-image-data'))
    
    registerIpcHandlers()
    const res = await handlers['read-file'](null, '/test/image.png')
    
    expect(res.type).toBe('image')
    expect(res.content).toMatch(/^data:image\/png;base64,/)
    expect(res.size).toBe(100)
  })

  it('大图片返回错误信息', async () => {
    const largeSize = 15 * 1024 * 1024 // 15MB
    mockFs.stat.mockResolvedValue({ size: largeSize })
    
    registerIpcHandlers()
    const res = await handlers['read-file'](null, '/test/huge.jpg')
    
    expect(res.error).toBe('IMAGE_TOO_LARGE')
    expect(res.size).toBe(largeSize)
  })

  it('小文本文件正常返回', async () => {
    const content = 'Hello, World!'
    mockFs.stat.mockResolvedValue({ size: content.length })
    mockFs.readFile.mockResolvedValue(content)
    
    registerIpcHandlers()
    const res = await handlers['read-file'](null, '/test/hello.txt')
    
    expect(res.type).toBe('text')
    expect(res.content).toBe(content)
    expect(res.size).toBe(content.length)
  })

  it('大文本文件截断返回', async () => {
    const largeSize = 2 * 1024 * 1024 // 2MB
    const truncatedContent = 'A'.repeat(1024 * 1024) // 1MB of content
    
    mockFs.stat.mockResolvedValue({ size: largeSize })
    
    const mockFileHandle = {
      read: jest.fn().mockResolvedValue({
        bytesRead: 1024 * 1024
      }),
      close: jest.fn()
    }
    mockFs.open.mockResolvedValue(mockFileHandle)
    
    registerIpcHandlers()
    const res = await handlers['read-file'](null, '/test/large.txt')
    
    expect(res.type).toBe('text')
    expect(res.truncated).toBe(true)
    expect(res.size).toBe(largeSize)
  })

  it('支持不同图片格式的 MIME 类型', async () => {
    const testCases = [
      { file: '/test/image.jpg', expectedMime: 'image/jpeg' },
      { file: '/test/image.gif', expectedMime: 'image/gif' },
      { file: '/test/image.svg', expectedMime: 'image/svg+xml' }
    ]

    for (const testCase of testCases) {
      mockFs.stat.mockResolvedValue({ size: 100 })
      mockFs.readFile.mockResolvedValue(Buffer.from('fake-data'))
      
      registerIpcHandlers()
      const res = await handlers['read-file'](null, testCase.file)
      
      expect(res.content).toMatch(new RegExp(`^data:${testCase.expectedMime.replace(/\+/g, '\\+')};base64,`))
    }
  })

  it('支持向后兼容的 options 参数', async () => {
    const content = 'test content'
    mockFs.stat.mockResolvedValue({ size: content.length })
    mockFs.readFile.mockResolvedValue(content)
    
    registerIpcHandlers()
    
    // 测试带 options
    const res1 = await handlers['read-file'](null, '/test/file.txt', { encoding: 'utf-8' })
    expect(res1.type).toBe('text')
    expect(res1.content).toBe(content)
    
    // 测试不带 options（向后兼容）
    const res2 = await handlers['read-file'](null, '/test/file.txt')
    expect(res2.type).toBe('text')
    expect(res2.content).toBe(content)
  })
})