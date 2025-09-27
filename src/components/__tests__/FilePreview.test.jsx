import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { FilePreview } from '../FilePreview'

// Mock Electron APIs
const mockElectron = {
  ipcRenderer: {
    invoke: jest.fn()
  }
}

Object.defineProperty(window, 'electron', {
  value: mockElectron,
  writable: true
})

describe('FilePreview', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('应该显示文本文件内容', async () => {
    const mockContent = 'Hello, World!'
    mockElectron.ipcRenderer.invoke.mockResolvedValue(mockContent)
    
    const file = { name: 'test.txt', type: 'file', path: '/test/test.txt' }
    render(<FilePreview file={file} />)
    
    await waitFor(() => {
      expect(screen.getByText('Hello, World!')).toBeInTheDocument()
    })
    
    expect(mockElectron.ipcRenderer.invoke).toHaveBeenCalledWith('read-file', '/test/test.txt')
  })

  test('应该显示图片文件', async () => {
    const mockImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    mockElectron.ipcRenderer.invoke.mockResolvedValue(mockImageData)
    
    const file = { name: 'test.png', type: 'file', path: '/test/test.png' }
    render(<FilePreview file={file} />)
    
    await waitFor(() => {
      const img = screen.getByRole('img')
      expect(img).toHaveAttribute('src', mockImageData)
    })
  })

  test('应该显示代码文件并高亮语法', async () => {
    const mockCode = 'function hello() {\n  console.log("Hello, World!");\n}'
    mockElectron.ipcRenderer.invoke.mockResolvedValue(mockCode)
    
    const file = { name: 'test.js', type: 'file', path: '/test/test.js' }
    
    await act(async () => {
      render(<FilePreview file={file} />)
    })
    
    await waitFor(() => {
      expect(screen.getByText(/function hello\(\) \{/)).toBeInTheDocument()
    })
  })

  test('应该显示不支持的文件类型提示', async () => {
    const file = { name: 'test.bin', type: 'file', path: '/test/test.bin' }
    render(<FilePreview file={file} />)
    
    await waitFor(() => {
      expect(screen.getByText('不支持预览此文件类型')).toBeInTheDocument()
    })
  })

  test('应该显示加载状态', () => {
    const file = { name: 'test.txt', type: 'file', path: '/test/test.txt' }
    render(<FilePreview file={file} />)
    
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  test('应该显示错误信息', async () => {
    mockElectron.ipcRenderer.invoke.mockRejectedValue(new Error('File not found'))
    
    const file = { name: 'test.txt', type: 'file', path: '/test/test.txt' }
    render(<FilePreview file={file} />)
    
    await waitFor(() => {
      expect(screen.getByText('文件读取失败: File not found')).toBeInTheDocument()
    })
  })

  test('应该在没有选择文件时显示提示', () => {
    render(<FilePreview file={null} />)
    
    expect(screen.getByText('请选择一个文件进行预览')).toBeInTheDocument()
  })
})