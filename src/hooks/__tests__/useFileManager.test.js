import { renderHook, act } from '@testing-library/react'
import { useFileManager } from '../useFileManager'

// Mock Electron APIs
const mockElectron = {
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn()
  }
}

// Mock window.electron
Object.defineProperty(window, 'electron', {
  value: mockElectron,
  writable: true
})

describe('useFileManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('应该初始化文件管理器状态', () => {
    const { result } = renderHook(() => useFileManager())
    
    expect(result.current.files).toEqual([])
    expect(result.current.currentPath).toBe('')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(null)
  })

  test('应该能够加载文件夹', async () => {
    const mockFiles = [
      { name: 'file1.txt', type: 'file', path: '/test/file1.txt' },
      { name: 'folder1', type: 'directory', path: '/test/folder1' }
    ]
    
    mockElectron.ipcRenderer.invoke.mockResolvedValue(mockFiles)
    
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.loadDirectory('/test')
    })
    
    expect(result.current.files).toEqual(mockFiles)
    expect(result.current.currentPath).toBe('/test')
    expect(mockElectron.ipcRenderer.invoke).toHaveBeenCalledWith('load-directory', '/test')
  })

  test('应该能够创建新文件', async () => {
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.createFile('/test/newfile.txt')
    })
    
    expect(mockElectron.ipcRenderer.invoke).toHaveBeenCalledWith('create-file', '/test/newfile.txt')
  })

  test('应该能够删除文件', async () => {
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.deleteFile('/test/file.txt')
    })
    
    expect(mockElectron.ipcRenderer.invoke).toHaveBeenCalledWith('delete-file', '/test/file.txt')
  })

  test('应该能够重命名文件', async () => {
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.renameFile('/test/oldname.txt', 'newname.txt')
    })
    
    expect(mockElectron.ipcRenderer.invoke).toHaveBeenCalledWith('rename-file', {
      oldPath: '/test/oldname.txt',
      newName: 'newname.txt'
    })
  })

  test('应该能够搜索文件', async () => {
    const mockSearchResults = [
      { name: 'test1.txt', type: 'file', path: '/test/test1.txt' },
      { name: 'test2.js', type: 'file', path: '/test/test2.js' }
    ]
    
    mockElectron.ipcRenderer.invoke.mockResolvedValue(mockSearchResults)
    
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.searchFiles('test')
    })
    
    expect(result.current.searchResults).toEqual(mockSearchResults)
    expect(mockElectron.ipcRenderer.invoke).toHaveBeenCalledWith('search-files', 'test')
  })

  test('应该处理加载错误', async () => {
    const errorMessage = 'Permission denied'
    mockElectron.ipcRenderer.invoke.mockRejectedValue(new Error(errorMessage))
    
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.loadDirectory('/test')
    })
    
    expect(result.current.error).toBe(errorMessage)
    expect(result.current.isLoading).toBe(false)
  })
})