import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FileTree } from '../FileTree'

// Mock useFileManager hook
const mockRenameFile = jest.fn()
const mockDeleteFile = jest.fn()

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
  deleteFile: mockDeleteFile,
  renameFile: mockRenameFile,
  searchFiles: jest.fn(),
  searchResults: []
}

jest.mock('../../hooks/useFileManager', () => ({
  useFileManager: () => mockUseFileManager
}))

// Mock window methods
Object.defineProperty(window, 'prompt', {
  writable: true,
  value: jest.fn(() => 'newname.txt')
})

Object.defineProperty(window, 'confirm', {
  writable: true,
  value: jest.fn(() => true)
})

Object.defineProperty(window, 'alert', {
  writable: true,
  value: jest.fn()
})

describe('FileTree Context Menu', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset window method mocks
    window.prompt.mockReturnValue('newname.txt')
    window.confirm.mockReturnValue(true)
    window.alert.mockClear()
  })

  test('应该显示右键菜单', () => {
    render(<FileTree />)

    const fileElement = screen.getByText('file1.txt')

    // 右键点击文件
    fireEvent.contextMenu(fileElement)

    // 应该显示右键菜单
    expect(screen.getByText('重命名')).toBeInTheDocument()
    expect(screen.getByText('删除')).toBeInTheDocument()
  })

  test('应该能够重命名文件', async () => {
    render(<FileTree />)

    const fileElement = screen.getByText('file1.txt')

    // 右键点击文件
    fireEvent.contextMenu(fileElement)

    // 点击重命名选项
    fireEvent.click(screen.getByText('重命名'))

    // 验证重命名函数被调用
    await waitFor(() => {
      expect(mockRenameFile).toHaveBeenCalledWith('/test/file1.txt', 'newname.txt')
    })
  })

  test('重命名时应该校验文件名', async () => {
    // 设置prompt返回包含非法字符的文件名
    window.prompt.mockReturnValue('file/with\\illegal:chars.txt')

    render(<FileTree />)

    const fileElement = screen.getByText('file1.txt')

    // 右键点击文件
    fireEvent.contextMenu(fileElement)

    // 点击重命名选项
    fireEvent.click(screen.getByText('重命名'))

    // 应该显示错误提示
    expect(window.alert).toHaveBeenCalledWith('文件名不能包含路径分隔符 (/ 或 \\) 或其他非法字符')

    // 重命名函数不应该被调用
    expect(mockRenameFile).not.toHaveBeenCalled()
  })

  test('应该能够删除文件', async () => {
    render(<FileTree />)

    const fileElement = screen.getByText('file1.txt')

    // 右键点击文件
    fireEvent.contextMenu(fileElement)

    // 点击删除选项
    fireEvent.click(screen.getByText('删除'))

    // 验证删除函数被调用
    await waitFor(() => {
      expect(mockDeleteFile).toHaveBeenCalledWith('/test/file1.txt')
    })
  })

  test('点击空白区域应该隐藏右键菜单', () => {
    render(<FileTree />)

    const fileElement = screen.getByText('file1.txt')

    // 右键点击文件显示菜单
    fireEvent.contextMenu(fileElement)
    expect(screen.getByText('重命名')).toBeInTheDocument()

    // 点击空白区域
    const container = screen.getByText('file1.txt').closest('.file-tree')
    fireEvent.click(container)

    // 菜单应该隐藏
    expect(screen.queryByText('重命名')).not.toBeInTheDocument()
  })
})