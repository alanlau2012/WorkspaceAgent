import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { FilePreview } from '../FilePreview'

// Mock react-syntax-highlighter
jest.mock('react-syntax-highlighter', () => ({
  Prism: ({ children, language, ...props }) => (
    <pre>
      <code className={`language-${language}`} {...props}>
        {children}
      </code>
    </pre>
  )
}))

jest.mock('react-syntax-highlighter/dist/cjs/styles/prism', () => ({
  oneDark: {}
}))

const mockElectronAPI = { readFile: jest.fn() }
Object.defineProperty(window, 'electronAPI', { value: mockElectronAPI, writable: true })

describe('FilePreview syntax highlight', () => {
  beforeEach(() => jest.clearAllMocks())

  it('高亮显示 JS 代码', async () => {
    mockElectronAPI.readFile.mockResolvedValue({ type: 'text', content: 'function hi(){}' })
    render(<FilePreview file={{ name: 'a.js', path: '/a.js', type: 'file' }} />)
    await waitFor(() => {
      // Prism 渲染后会在内部 code 上附加 language-javascript 类
      const code = document.querySelector('code.language-javascript')
      expect(code).toBeTruthy()
      expect(code.textContent).toMatch('function hi()')
    })
  })

  it('高亮显示 TypeScript 代码', async () => {
    mockElectronAPI.readFile.mockResolvedValue({ type: 'text', content: 'interface User { name: string }' })
    render(<FilePreview file={{ name: 'a.ts', path: '/a.ts', type: 'file' }} />)
    await waitFor(() => {
      const code = document.querySelector('code.language-typescript')
      expect(code).toBeTruthy()
      expect(code.textContent).toMatch('interface User')
    })
  })

  it('高亮显示 CSS 代码', async () => {
    mockElectronAPI.readFile.mockResolvedValue({ type: 'text', content: '.class { color: red; }' })
    render(<FilePreview file={{ name: 'a.css', path: '/a.css', type: 'file' }} />)
    await waitFor(() => {
      const code = document.querySelector('code.language-css')
      expect(code).toBeTruthy()
      expect(code.textContent).toMatch('.class { color: red; }')
    })
  })

  it('显示图片 data URL', async () => {
    const dataUrl = 'data:image/png;base64,AAAA'
    mockElectronAPI.readFile.mockResolvedValue({ type: 'image', content: dataUrl })
    render(<FilePreview file={{ name: 'a.png', path: '/a.png', type: 'file' }} />)
    const img = await screen.findByRole('img')
    expect(img).toHaveAttribute('src', dataUrl)
  })

  it('显示文本文件（不高亮）', async () => {
    mockElectronAPI.readFile.mockResolvedValue({ type: 'text', content: 'plain text content' })
    render(<FilePreview file={{ name: 'a.txt', path: '/a.txt', type: 'file' }} />)
    await waitFor(() => {
      const code = document.querySelector('code.language-text')
      expect(code).toBeTruthy()
      expect(code.textContent).toMatch('plain text content')
    })
  })

  it('显示大文件截断提示', async () => {
    const content = 'line\n'.repeat(3000)
    mockElectronAPI.readFile.mockResolvedValue({ 
      type: 'text', 
      content, 
      truncated: true,
      size: 1024 * 1024 * 2 // 2MB
    })
    render(<FilePreview file={{ name: 'large.js', path: '/large.js', type: 'file' }} />)
    await waitFor(() => {
      expect(screen.getByText(/已截断预览/)).toBeInTheDocument()
    })
  })

  it('处理读取错误', async () => {
    mockElectronAPI.readFile.mockResolvedValue({ error: 'IMAGE_TOO_LARGE', size: 20971520 })
    render(<FilePreview file={{ name: 'huge.png', path: '/huge.png', type: 'file' }} />)
    await waitFor(() => {
      expect(screen.getByText(/文件读取失败/)).toBeInTheDocument()
    })
  })

  it('向后兼容字符串返回值', async () => {
    // 测试旧的字符串返回格式仍然工作
    mockElectronAPI.readFile.mockResolvedValue('simple string content')
    render(<FilePreview file={{ name: 'a.js', path: '/a.js', type: 'file' }} />)
    await waitFor(() => {
      const code = document.querySelector('code.language-javascript')
      expect(code).toBeTruthy()
      expect(code.textContent).toMatch('simple string content')
    })
  })
})