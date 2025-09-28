import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toolbar } from '../Toolbar'
import { useFileManager } from '../../hooks/useFileManager'

// Mock the useFileManager hook
jest.mock('../../hooks/useFileManager')

describe('Toolbar', () => {
  const mockLoadDirectory = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    useFileManager.mockReturnValue({
      loadDirectory: mockLoadDirectory,
      currentPath: '/test/path'
    })
  })

  test('should render toolbar buttons', () => {
    render(<Toolbar />)
    
    expect(screen.getByText('打开')).toBeInTheDocument()
    expect(screen.getByText('刷新')).toBeInTheDocument()
    expect(screen.getByText('新建')).toBeInTheDocument()
  })

  test('should render current path when available', () => {
    render(<Toolbar />)
    
    expect(screen.getByText('/test/path')).toBeInTheDocument()
  })

  test('should not render current path when empty', () => {
    useFileManager.mockReturnValue({
      loadDirectory: mockLoadDirectory,
      currentPath: ''
    })
    
    render(<Toolbar />)
    
    expect(screen.queryByText('/test/path')).not.toBeInTheDocument()
  })

  test('should call loadDirectory when open folder button is clicked', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    
    const openButton = screen.getByText('打开')
    await user.click(openButton)
    
    expect(mockLoadDirectory).toHaveBeenCalledWith('')
  })

  test('should call loadDirectory with current path when refresh button is clicked', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    
    const refreshButton = screen.getByText('刷新')
    await user.click(refreshButton)
    
    expect(mockLoadDirectory).toHaveBeenCalledWith('/test/path')
  })

  test('should have correct button titles', () => {
    render(<Toolbar />)
    
    expect(screen.getByTitle('打开文件夹')).toBeInTheDocument()
    expect(screen.getByTitle('刷新')).toBeInTheDocument()
    expect(screen.getByTitle('新建文件')).toBeInTheDocument()
  })

  test('should display icons and labels correctly', () => {
    render(<Toolbar />)
    
    // Check that buttons contain both icon and label
    const openButton = screen.getByText('打开').closest('.toolbar-btn')
    expect(openButton).toHaveTextContent('📁')
    expect(openButton).toHaveTextContent('打开')
    
    const refreshButton = screen.getByText('刷新').closest('.toolbar-btn')
    expect(refreshButton).toHaveTextContent('🔄')
    expect(refreshButton).toHaveTextContent('刷新')
    
    const newButton = screen.getByText('新建').closest('.toolbar-btn')
    expect(newButton).toHaveTextContent('📄')
    expect(newButton).toHaveTextContent('新建')
  })

  test('should handle new file button click', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    const user = userEvent.setup()
    render(<Toolbar />)
    
    const newButton = screen.getByText('新建')
    await user.click(newButton)
    
    expect(consoleSpy).toHaveBeenCalledWith('新建文件')
    
    consoleSpy.mockRestore()
  })
})