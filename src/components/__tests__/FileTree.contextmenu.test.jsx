import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileTree } from '../FileTree'

// Mock FileManagerContext
const mockFileManagerContext = {
  files: [
    { name: 'file1.txt', type: 'file', path: '/test/file1.txt' },
    { 
      name: 'folder1', 
      type: 'directory', 
      path: '/test/folder1',
      children: [
        { name: 'nested.txt', type: 'file', path: '/test/folder1/nested.txt' }
      ]
    }
  ],
  isLoading: false,
  error: null,
  searchResults: [],
  searchFiles: jest.fn(),
  renamePath: jest.fn(),
  deletePath: jest.fn()
}

// Mock useFileManagerCtx
jest.mock('../../contexts/FileManagerContext', () => ({
  useFileManagerCtx: () => mockFileManagerContext
}))

// Mock window functions
global.prompt = jest.fn()
global.confirm = jest.fn()

describe('FileTree Context Menu', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('右键点击应该显示上下文菜单', () => {
    render(<FileTree />)
    
    const fileItem = screen.getByText('file1.txt').closest('.file-row')
    
    fireEvent.contextMenu(fileItem)
    
    expect(screen.getByText('重命名')).toBeInTheDocument()
    expect(screen.getByText('删除')).toBeInTheDocument()
  })

  test('点击重命名应该调用renamePath', () => {
    global.prompt.mockReturnValue('newname.txt')
    
    render(<FileTree />)
    
    const fileItem = screen.getByText('file1.txt').closest('.file-row')
    fireEvent.contextMenu(fileItem)
    
    const renameItem = screen.getByText('重命名')
    fireEvent.click(renameItem)
    
    expect(global.prompt).toHaveBeenCalledWith('新名称：', 'file1.txt')
    expect(mockFileManagerContext.renamePath).toHaveBeenCalledWith('/test/file1.txt', 'newname.txt')
  })

  test('重命名取消或空名称时不应该调用renamePath', () => {
    global.prompt.mockReturnValue('')
    
    render(<FileTree />)
    
    const fileItem = screen.getByText('file1.txt').closest('.file-row')
    fireEvent.contextMenu(fileItem)
    
    const renameItem = screen.getByText('重命名')
    fireEvent.click(renameItem)
    
    expect(mockFileManagerContext.renamePath).not.toHaveBeenCalled()
  })

  test('重命名相同名称时不应该调用renamePath', () => {
    global.prompt.mockReturnValue('file1.txt')
    
    render(<FileTree />)
    
    const fileItem = screen.getByText('file1.txt').closest('.file-row')
    fireEvent.contextMenu(fileItem)
    
    const renameItem = screen.getByText('重命名')
    fireEvent.click(renameItem)
    
    expect(mockFileManagerContext.renamePath).not.toHaveBeenCalled()
  })

  test('点击删除确认后应该调用deletePath', () => {
    global.confirm.mockReturnValue(true)
    
    render(<FileTree />)
    
    const fileItem = screen.getByText('file1.txt').closest('.file-row')
    fireEvent.contextMenu(fileItem)
    
    const deleteItem = screen.getByText('删除')
    fireEvent.click(deleteItem)
    
    expect(global.confirm).toHaveBeenCalledWith('确认删除 file1.txt ?')
    expect(mockFileManagerContext.deletePath).toHaveBeenCalledWith('/test/file1.txt')
  })

  test('点击删除取消时不应该调用deletePath', () => {
    global.confirm.mockReturnValue(false)
    
    render(<FileTree />)
    
    const fileItem = screen.getByText('file1.txt').closest('.file-row')
    fireEvent.contextMenu(fileItem)
    
    const deleteItem = screen.getByText('删除')
    fireEvent.click(deleteItem)
    
    expect(mockFileManagerContext.deletePath).not.toHaveBeenCalled()
  })

  test('菜单应该在鼠标离开时隐藏', () => {
    render(<FileTree />)
    
    const fileItem = screen.getByText('file1.txt').closest('.file-row')
    fireEvent.contextMenu(fileItem)
    
    expect(screen.getByText('重命名')).toBeInTheDocument()
    
    const menu = screen.getByText('重命名').closest('.context-menu')
    fireEvent.mouseLeave(menu)
    
    expect(screen.queryByText('重命名')).not.toBeInTheDocument()
  })

  test('点击FileTree其他区域应该隐藏菜单', () => {
    render(<FileTree />)
    
    const fileItem = screen.getByText('file1.txt').closest('.file-row')
    fireEvent.contextMenu(fileItem)
    
    expect(screen.getByText('重命名')).toBeInTheDocument()
    
    const fileTree = screen.getByText('file1.txt').closest('.file-tree')
    fireEvent.click(fileTree)
    
    expect(screen.queryByText('重命名')).not.toBeInTheDocument()
  })

  test('右键点击文件夹应该也显示上下文菜单', () => {
    render(<FileTree />)
    
    const folderItem = screen.getByText('folder1').closest('.file-row')
    fireEvent.contextMenu(folderItem)
    
    expect(screen.getByText('重命名')).toBeInTheDocument()
    expect(screen.getByText('删除')).toBeInTheDocument()
  })

  test('菜单项点击后应该隐藏菜单', () => {
    global.prompt.mockReturnValue('newname.txt')
    
    render(<FileTree />)
    
    const fileItem = screen.getByText('file1.txt').closest('.file-row')
    fireEvent.contextMenu(fileItem)
    
    const renameItem = screen.getByText('重命名')
    fireEvent.click(renameItem)
    
    expect(screen.queryByText('重命名')).not.toBeInTheDocument()
  })
})