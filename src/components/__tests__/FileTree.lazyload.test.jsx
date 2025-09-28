import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FileTree } from '../FileTree'
import { useFileManager } from '../../hooks/useFileManager'

// Mock the useFileManager hook
jest.mock('../../hooks/useFileManager')

describe('FileTree Lazy Loading', () => {
  const mockLoadChildren = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    useFileManager.mockReturnValue({
      files: [
        {
          name: 'test-folder',
          type: 'directory',
          path: '/test-folder',
          children: [] // 空children，需要懒加载
        },
        {
          name: 'loaded-folder',
          type: 'directory',
          path: '/loaded-folder',
          children: [
            { name: 'child1.txt', type: 'file', path: '/loaded-folder/child1.txt' }
          ]
        }
      ],
      isLoading: false,
      error: null,
      searchResults: [],
      loadedPaths: new Set(['/loaded-folder']), // 已加载的路径
      loadChildren: mockLoadChildren,
      deleteFile: jest.fn(),
      renameFile: jest.fn(),
      searchFiles: jest.fn()
    })
  })

  test('should trigger loadChildren when expanding unloaded folder', async () => {
    render(<FileTree />)
    
    const folderItem = screen.getByText('test-folder')
    fireEvent.click(folderItem)
    
    await waitFor(() => {
      expect(mockLoadChildren).toHaveBeenCalledWith('/test-folder')
    })
  })

  test('should not trigger loadChildren when expanding already loaded folder', async () => {
    render(<FileTree />)
    
    const folderItem = screen.getByText('loaded-folder')
    fireEvent.click(folderItem)
    
    await waitFor(() => {
      expect(mockLoadChildren).not.toHaveBeenCalled()
    })
  })

  test('should show loading indicator when loading children', async () => {
    // 模拟正在加载的状态
    useFileManager.mockReturnValue({
      files: [
        {
          name: 'test-folder',
          type: 'directory',
          path: '/test-folder',
          children: []
        }
      ],
      isLoading: false,
      error: null,
      searchResults: [],
      loadedPaths: new Set(),
      loadChildren: mockLoadChildren,
      deleteFile: jest.fn(),
      renameFile: jest.fn(),
      searchFiles: jest.fn()
    })

    render(<FileTree />)
    
    const folderItem = screen.getByText('test-folder')
    fireEvent.click(folderItem)
    
    // 应该显示加载指示器
    expect(screen.getByText('⏳')).toBeInTheDocument()
  })

  test('should show correct folder toggle icons', () => {
    render(<FileTree />)
    
    // 未加载的文件夹应该显示 •
    const unloadedFolder = screen.getByText('test-folder').closest('.file-row')
    expect(unloadedFolder).toHaveTextContent('•')
    
    // 已加载的文件夹应该显示 ▶
    const loadedFolder = screen.getByText('loaded-folder').closest('.file-row')
    expect(loadedFolder).toHaveTextContent('▶')
  })

  test('should handle loadChildren errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    mockLoadChildren.mockRejectedValue(new Error('Load failed'))
    
    render(<FileTree />)
    
    const folderItem = screen.getByText('test-folder')
    fireEvent.click(folderItem)
    
    await waitFor(() => {
      expect(mockLoadChildren).toHaveBeenCalledWith('/test-folder')
    })
    
    consoleErrorSpy.mockRestore()
  })

  test('should expand folder after loading children', async () => {
    const mockChildren = [
      { name: 'child1.txt', type: 'file', path: '/test-folder/child1.txt' },
      { name: 'child2.txt', type: 'file', path: '/test-folder/child2.txt' }
    ]
    
    // 模拟loadChildren成功后的状态更新
    useFileManager.mockReturnValue({
      files: [
        {
          name: 'test-folder',
          type: 'directory',
          path: '/test-folder',
          children: mockChildren
        }
      ],
      isLoading: false,
      error: null,
      searchResults: [],
      loadedPaths: new Set(['/test-folder']),
      loadChildren: mockLoadChildren,
      deleteFile: jest.fn(),
      renameFile: jest.fn(),
      searchFiles: jest.fn()
    })

    render(<FileTree />)
    
    const folderItem = screen.getByText('test-folder')
    fireEvent.click(folderItem)
    
    // 应该显示子文件
    expect(screen.getByText('child1.txt')).toBeInTheDocument()
    expect(screen.getByText('child2.txt')).toBeInTheDocument()
  })
})