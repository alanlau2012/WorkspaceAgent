import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FileTree } from '../FileTree'

// Mock useFileManager hook
const mockLoadChildren = jest.fn()

let mockUseFileManager = {
  files: [
    {
      name: 'folder1',
      type: 'directory',
      path: '/test/folder1',
      isDirectory: true,
      children: [] // 初始为空，需要懒加载
    }
  ],
  currentPath: '/test',
  isLoading: false,
  error: null,
  loadDirectory: jest.fn(),
  loadChildren: mockLoadChildren,
  createFile: jest.fn(),
  deleteFile: jest.fn(),
  renameFile: jest.fn(),
  searchFiles: jest.fn(),
  searchResults: []
}

jest.mock('../../hooks/useFileManager', () => ({
  useFileManager: () => mockUseFileManager
}))

describe('FileTree 懒加载', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLoadChildren.mockResolvedValue([
      { name: 'subfile1.js', type: 'file', path: '/test/folder1/subfile1.js', isDirectory: false, children: undefined }
    ])
  })

  test('应该在展开空目录时调用loadChildren', async () => {
    render(<FileTree />)

    const folderElement = screen.getByText('folder1')

    // 点击展开文件夹
    fireEvent.click(folderElement)

    // 等待懒加载被触发
    await waitFor(() => {
      expect(mockLoadChildren).toHaveBeenCalledWith('/test/folder1')
    })

    // 模拟加载完成，更新mock数据
    mockUseFileManager.files = [
      {
        name: 'folder1',
        path: '/test/folder1',
        isDirectory: true,
        children: [
          { name: 'subfile1.js', path: '/test/folder1/subfile1.js', isDirectory: false, children: undefined }
        ]
      }
    ]

    // 重新渲染组件以反映更新后的数据
    render(<FileTree />)

    // 应该显示子文件
    expect(screen.getByText('subfile1.js')).toBeInTheDocument()
  })

  test('应该在加载失败时处理错误', async () => {
    mockLoadChildren.mockRejectedValue(new Error('加载失败'))

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    render(<FileTree />)

    const folderElement = screen.getByText('folder1')

    // 点击展开文件夹
    fireEvent.click(folderElement)

    // 等待错误处理
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('加载子目录失败:', expect.any(Error))
    })

    consoleSpy.mockRestore()
  })

  test('已有子项的目录不应该触发懒加载', async () => {
    // 设置文件夹已有子项
    mockUseFileManager.files = [
      {
        name: 'folder1',
        type: 'directory',
        path: '/test/folder1',
        isDirectory: true,
        children: [
          { name: 'existing.js', type: 'file', path: '/test/folder1/existing.js', isDirectory: false, children: undefined }
        ]
      }
    ]

    render(<FileTree />)

    const folderElement = screen.getByText('folder1')

    // 点击展开文件夹
    fireEvent.click(folderElement)

    // 不应该调用loadChildren
    expect(mockLoadChildren).not.toHaveBeenCalled()

    // 应该直接显示现有子项
    expect(screen.getByText('existing.js')).toBeInTheDocument()
  })
})