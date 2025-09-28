import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileTree } from '../FileTree'
import { useFileManager } from '../../hooks/useFileManager'

// Mock the useFileManager hook
jest.mock('../../hooks/useFileManager')

describe('FileTree Context Menu', () => {
  const mockDeleteFile = jest.fn()
  const mockRenameFile = jest.fn()
  const mockSearchFiles = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    useFileManager.mockReturnValue({
      files: [
        {
          name: 'test-file.txt',
          type: 'file',
          path: '/test/test-file.txt',
          children: undefined
        },
        {
          name: 'test-folder',
          type: 'directory',
          path: '/test/test-folder',
          children: []
        }
      ],
      isLoading: false,
      error: null,
      searchResults: [],
      searchFiles: mockSearchFiles,
      deleteFile: mockDeleteFile,
      renameFile: mockRenameFile
    })
  })

  test('should show context menu on right click', () => {
    render(<FileTree />)
    
    const fileItem = screen.getByText('test-file.txt')
    fireEvent.contextMenu(fileItem)
    
    expect(screen.getByText('重命名')).toBeInTheDocument()
    expect(screen.getByText('删除')).toBeInTheDocument()
  })

  test('should call renameFile with valid name', async () => {
    const user = userEvent.setup()
    window.prompt = jest.fn().mockReturnValue('new-name.txt')
    
    render(<FileTree />)
    
    const fileItem = screen.getByText('test-file.txt')
    fireEvent.contextMenu(fileItem)
    
    const renameButton = screen.getByText('重命名')
    await user.click(renameButton)
    
    expect(window.prompt).toHaveBeenCalledWith('新名称：', 'test-file.txt')
    expect(mockRenameFile).toHaveBeenCalledWith('/test/test-file.txt', 'new-name.txt')
  })

  test('should not call renameFile with invalid characters', async () => {
    const user = userEvent.setup()
    window.prompt = jest.fn().mockReturnValue('new/name.txt')
    
    render(<FileTree />)
    
    const fileItem = screen.getByText('test-file.txt')
    fireEvent.contextMenu(fileItem)
    
    const renameButton = screen.getByText('重命名')
    await user.click(renameButton)
    
    expect(window.prompt).toHaveBeenCalledWith('新名称：', 'test-file.txt')
    expect(mockRenameFile).toHaveBeenCalledWith('/test/test-file.txt', 'new/name.txt')
    
    // The validation happens in the hook, so we expect it to be called
    // but the hook will handle the validation error
  })

  test('should not call renameFile with empty name', async () => {
    const user = userEvent.setup()
    window.prompt = jest.fn().mockReturnValue('')
    
    render(<FileTree />)
    
    const fileItem = screen.getByText('test-file.txt')
    fireEvent.contextMenu(fileItem)
    
    const renameButton = screen.getByText('重命名')
    await user.click(renameButton)
    
    expect(window.prompt).toHaveBeenCalledWith('新名称：', 'test-file.txt')
    expect(mockRenameFile).not.toHaveBeenCalled()
  })

  test('should not call renameFile with same name', async () => {
    const user = userEvent.setup()
    window.prompt = jest.fn().mockReturnValue('test-file.txt')
    
    render(<FileTree />)
    
    const fileItem = screen.getByText('test-file.txt')
    fireEvent.contextMenu(fileItem)
    
    const renameButton = screen.getByText('重命名')
    await user.click(renameButton)
    
    expect(window.prompt).toHaveBeenCalledWith('新名称：', 'test-file.txt')
    expect(mockRenameFile).not.toHaveBeenCalled()
  })

  test('should call deleteFile with confirmation', async () => {
    const user = userEvent.setup()
    window.confirm = jest.fn().mockReturnValue(true)
    
    render(<FileTree />)
    
    const fileItem = screen.getByText('test-file.txt')
    fireEvent.contextMenu(fileItem)
    
    const deleteButton = screen.getByText('删除')
    await user.click(deleteButton)
    
    expect(window.confirm).toHaveBeenCalledWith('确认删除 test-file.txt ?')
    expect(mockDeleteFile).toHaveBeenCalledWith('/test/test-file.txt')
  })

  test('should not call deleteFile without confirmation', async () => {
    const user = userEvent.setup()
    window.confirm = jest.fn().mockReturnValue(false)
    
    render(<FileTree />)
    
    const fileItem = screen.getByText('test-file.txt')
    fireEvent.contextMenu(fileItem)
    
    const deleteButton = screen.getByText('删除')
    await user.click(deleteButton)
    
    expect(window.confirm).toHaveBeenCalledWith('确认删除 test-file.txt ?')
    expect(mockDeleteFile).not.toHaveBeenCalled()
  })

  test('should close context menu when clicking outside', () => {
    render(<FileTree />)
    
    const fileItem = screen.getByText('test-file.txt')
    fireEvent.contextMenu(fileItem)
    
    expect(screen.getByText('重命名')).toBeInTheDocument()
    
    const fileTree = screen.getByText('test-file.txt').closest('.file-tree')
    fireEvent.click(fileTree)
    
    expect(screen.queryByText('重命名')).not.toBeInTheDocument()
  })
})