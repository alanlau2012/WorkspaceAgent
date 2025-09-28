import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

// Mock FileManagerContext
const mockFileManagerContext = {
  files: [],
  currentPath: '/test/path',
  isLoading: false,
  error: null,
  searchResults: [],
  loadDirectory: jest.fn(),
  refresh: jest.fn(),
  createFolder: jest.fn(),
  deleteFile: jest.fn(),
  renameFile: jest.fn(),
  searchFiles: jest.fn(),
  setCurrentPath: jest.fn()
}

// Mock useFileManagerCtx
jest.mock('../contexts/FileManagerContext', () => ({
  FileManagerProvider: ({ children }) => <div>{children}</div>,
  useFileManagerCtx: () => mockFileManagerContext
}))

// Mock FileTree and FilePreview components
jest.mock('../components/FileTree', () => ({
  FileTree: () => <div data-testid="file-tree">FileTree</div>
}))

jest.mock('../components/FilePreview', () => ({
  FilePreview: () => <div data-testid="file-preview">FilePreview</div>
}))

// Mock window.prompt and window.alert
global.prompt = jest.fn()
global.alert = jest.fn()

describe('App Toolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('应该渲染所有工具栏按钮', () => {
    render(<App />)
    
    expect(screen.getByText('📁 打开')).toBeInTheDocument()
    expect(screen.getByText('🔄 刷新')).toBeInTheDocument()
    expect(screen.getByText('➕ 新建')).toBeInTheDocument()
  })

  test('应该显示当前路径', () => {
    render(<App />)
    
    expect(screen.getByText('当前目录: /test/path')).toBeInTheDocument()
  })

  test('点击打开按钮应该调用loadDirectory', () => {
    render(<App />)
    
    const openButton = screen.getByText('📁 打开')
    fireEvent.click(openButton)
    
    expect(mockFileManagerContext.loadDirectory).toHaveBeenCalledWith('')
  })

  test('点击刷新按钮应该调用refresh', () => {
    render(<App />)
    
    const refreshButton = screen.getByText('🔄 刷新')
    fireEvent.click(refreshButton)
    
    expect(mockFileManagerContext.refresh).toHaveBeenCalled()
  })

  test('点击新建按钮应该创建文件夹', () => {
    global.prompt.mockReturnValue('newfolder')
    
    render(<App />)
    
    const createButton = screen.getByText('➕ 新建')
    fireEvent.click(createButton)
    
    expect(global.prompt).toHaveBeenCalledWith('新建文件夹名称：')
    expect(mockFileManagerContext.createFolder).toHaveBeenCalledWith('/test/path/newfolder')
  })

  test('没有输入文件夹名称时不应该创建', () => {
    global.prompt.mockReturnValue('')
    
    render(<App />)
    
    const createButton = screen.getByText('➕ 新建')
    fireEvent.click(createButton)
    
    expect(mockFileManagerContext.createFolder).not.toHaveBeenCalled()
  })

  test('取消输入时不应该创建文件夹', () => {
    global.prompt.mockReturnValue(null)
    
    render(<App />)
    
    const createButton = screen.getByText('➕ 新建')
    fireEvent.click(createButton)
    
    expect(mockFileManagerContext.createFolder).not.toHaveBeenCalled()
  })

  test('没有当前路径时应该提示先打开目录', () => {
    // 直接修改mockFileManagerContext的currentPath
    const originalCurrentPath = mockFileManagerContext.currentPath
    mockFileManagerContext.currentPath = ''
    
    global.prompt.mockReturnValue('newfolder')
    
    render(<App />)
    
    const createButton = screen.getByText('➕ 新建')
    fireEvent.click(createButton)
    
    expect(global.alert).toHaveBeenCalledWith('请先打开一个工作目录')
    expect(mockFileManagerContext.createFolder).not.toHaveBeenCalled()
    
    // 恢复原始值
    mockFileManagerContext.currentPath = originalCurrentPath
  })

  test('应该渲染FileTree和FilePreview组件', () => {
    render(<App />)
    
    expect(screen.getByTestId('file-tree')).toBeInTheDocument()
    expect(screen.getByTestId('file-preview')).toBeInTheDocument()
  })
})