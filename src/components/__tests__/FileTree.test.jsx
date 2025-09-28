import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FileTree } from '../FileTree'

// Mock useFileManager hook
let mockUseFileManager = {
  files: [
    { name: 'file1.txt', type: 'file', path: '/test/file1.txt' },
    { name: 'folder1', type: 'directory', path: '/test/folder1', children: [
      { name: 'subfile1.js', type: 'file', path: '/test/folder1/subfile1.js' }
    ]}
  ],
  currentPath: '/test',
  isLoading: false,
  error: null,
  loadDirectory: jest.fn(),
  createFile: jest.fn(),
  deleteFile: jest.fn(),
  renameFile: jest.fn(),
  searchFiles: jest.fn(),
  searchResults: []
}

jest.mock('../../hooks/useFileManager', () => ({
  useFileManager: () => mockUseFileManager
}))

describe('FileTree', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('应该渲染文件树', () => {
    render(<FileTree />)
    
    expect(screen.getByText('file1.txt')).toBeInTheDocument()
    expect(screen.getByText('folder1')).toBeInTheDocument()
  })

  test('应该能够展开和折叠文件夹', async () => {
    render(<FileTree />)
    
    const folderElement = screen.getByText('folder1')
    fireEvent.click(folderElement)
    
    await waitFor(() => {
      expect(screen.getByText('subfile1.js')).toBeInTheDocument()
    })
  })

  test('应该能够选择文件', () => {
    const onFileSelect = jest.fn()
    render(<FileTree onFileSelect={onFileSelect} />)
    
    const fileElement = screen.getByText('file1.txt')
    fireEvent.click(fileElement)
    
    expect(onFileSelect).toHaveBeenCalledWith({
      name: 'file1.txt',
      type: 'file',
      path: '/test/file1.txt'
    })
  })

  test('应该显示加载状态', () => {
    // Temporarily change the mock
    const originalMock = mockUseFileManager
    mockUseFileManager = {
      ...originalMock,
      isLoading: true
    }
    
    render(<FileTree />)
    expect(screen.getByText('加载中...')).toBeInTheDocument()
    
    // Restore original mock
    mockUseFileManager = originalMock
  })

  test('应该显示错误信息', () => {
    // Temporarily change the mock
    const originalMock = mockUseFileManager
    mockUseFileManager = {
      ...originalMock,
      error: 'Permission denied'
    }
    
    render(<FileTree />)
    expect(screen.getByText('Permission denied')).toBeInTheDocument()
    
    // Restore original mock
    mockUseFileManager = originalMock
  })

  test('应该能够显示搜索框', () => {
    render(<FileTree showSearch={true} />)
    
    expect(screen.getByPlaceholderText('搜索文件...')).toBeInTheDocument()
  })

  test('应该能够处理搜索输入', async () => {
    render(<FileTree showSearch={true} />)
    
    const searchInput = screen.getByPlaceholderText('搜索文件...')
    fireEvent.change(searchInput, { target: { value: 'test' } })
    
    await waitFor(() => {
      expect(mockUseFileManager.searchFiles).toHaveBeenCalledWith('test')
    })
  })

  test('工具栏按钮应触发对应的 Hook 方法', () => {
    render(<FileTree />)

    // 刷新
    fireEvent.click(screen.getByTestId('btn-refresh'))
    expect(mockUseFileManager.loadDirectory).toHaveBeenCalledWith('/test')

    // 选择根目录
    fireEvent.click(screen.getByTestId('btn-select-root'))
    expect(mockUseFileManager.loadDirectory).toHaveBeenCalledWith('')

    // 新建
    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('/test/new.txt')
    fireEvent.click(screen.getByTestId('btn-new-file'))
    expect(mockUseFileManager.createFile).toHaveBeenCalledWith('/test/new.txt')

    // 重命名
    promptSpy.mockReturnValueOnce('/test/old.txt').mockReturnValueOnce('new.txt')
    fireEvent.click(screen.getByTestId('btn-rename-file'))
    expect(mockUseFileManager.renameFile).toHaveBeenCalledWith('/test/old.txt', 'new.txt')

    // 删除
    promptSpy.mockReturnValue('/test/del.txt')
    fireEvent.click(screen.getByTestId('btn-delete-file'))
    expect(mockUseFileManager.deleteFile).toHaveBeenCalledWith('/test/del.txt')

    promptSpy.mockRestore()
  })
})