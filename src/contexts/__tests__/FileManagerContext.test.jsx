import React from 'react'
import { render, renderHook } from '@testing-library/react'
import { FileManagerProvider, useFileManagerCtx } from '../FileManagerContext'

// Mock useFileManager
jest.mock('../../hooks/useFileManager')
import { useFileManager } from '../../hooks/useFileManager'

const mockFileManager = {
  files: [],
  currentPath: '',
  isLoading: false,
  error: null,
  searchResults: [],
  loadDirectory: jest.fn(),
  refresh: jest.fn(),
  createFile: jest.fn(),
  createFolder: jest.fn(),
  deleteFile: jest.fn(),
  deletePath: jest.fn(),
  renameFile: jest.fn(),
  renamePath: jest.fn(),
  searchFiles: jest.fn(),
  setCurrentPath: jest.fn()
}

describe('FileManagerContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useFileManager.mockReturnValue(mockFileManager)
  })

  test('应该提供FileManager状态给子组件', () => {
    let contextValue
    
    const TestComponent = () => {
      contextValue = useFileManagerCtx()
      return <div>Test</div>
    }

    render(
      <FileManagerProvider>
        <TestComponent />
      </FileManagerProvider>
    )

    expect(contextValue).toBe(mockFileManager)
    expect(useFileManager).toHaveBeenCalledTimes(1)
  })

  test('应该在Provider外使用时抛出错误', () => {
    const TestComponent = () => {
      useFileManagerCtx()
      return <div>Test</div>
    }

    // 使用console.error mock来避免测试输出错误信息
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useFileManagerCtx must be used within FileManagerProvider')
    
    consoleSpy.mockRestore()
  })

  test('应该传递所有useFileManager的方法', () => {
    const TestComponent = () => {
      const ctx = useFileManagerCtx()
      
      // 验证所有方法都存在
      expect(ctx.loadDirectory).toBeDefined()
      expect(ctx.refresh).toBeDefined()
      expect(ctx.createFolder).toBeDefined()
      expect(ctx.deletePath).toBeDefined()
      expect(ctx.renamePath).toBeDefined()
      expect(ctx.createFile).toBeDefined()
      expect(ctx.deleteFile).toBeDefined()
      expect(ctx.renameFile).toBeDefined()
      expect(ctx.searchFiles).toBeDefined()
      expect(ctx.setCurrentPath).toBeDefined()
      
      // 验证状态属性
      expect(ctx.files).toBeDefined()
      expect(ctx.currentPath).toBeDefined()
      expect(ctx.isLoading).toBeDefined()
      expect(ctx.error).toBeDefined()
      expect(ctx.searchResults).toBeDefined()
      
      return <div>Test</div>
    }

    render(
      <FileManagerProvider>
        <TestComponent />
      </FileManagerProvider>
    )
  })
})