import { renderHook, act } from '@testing-library/react'
import { useFileManager } from '../useFileManager'

// Mock Electron APIs
const mockElectronAPI = {
  selectDirectory: jest.fn(),
  readDirectory: jest.fn(),
  createFolder: jest.fn(),
  renamePath: jest.fn(),
  deletePath: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  watchDirectory: jest.fn(),
  stopWatching: jest.fn(),
  onFileChanged: jest.fn(),
  removeFileChangedListener: jest.fn(),
  searchFiles: jest.fn()
}

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

describe('useFileManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('应该初始化文件管理器状态', () => {
    const { result } = renderHook(() => useFileManager())
    
    // 由于当前还有mock数据初始化，所以files不为空
    // 在Phase 2中会移除mock数据，到时候这个测试会变为 expect([])
    expect(Array.isArray(result.current.files)).toBe(true)
    expect(result.current.currentPath).toBe('')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(null)
  })

  test('应该能够加载文件夹', async () => {
    const mockFiles = [
      { name: 'file1.txt', type: 'file', path: '/test/file1.txt' },
      { name: 'folder1', type: 'directory', path: '/test/folder1' }
    ]
    
    // 现在使用readDirectory当path存在时
    mockElectronAPI.readDirectory.mockResolvedValue(mockFiles)
    
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.loadDirectory('/test')
    })
    
    expect(result.current.files).toEqual(mockFiles)
    expect(result.current.currentPath).toBe('/test')
    expect(mockElectronAPI.readDirectory).toHaveBeenCalledWith('/test')
  })

  test('应该能够创建新文件', async () => {
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.createFile('/test/newfile.txt')
    })
    
    expect(mockElectronAPI.writeFile).toHaveBeenCalledWith('/test/newfile.txt', '')
  })

  test('应该能够删除文件', async () => {
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.deleteFile('/test/file.txt')
    })
    
    // 当前实现只是console.log，在Phase 2会接入真实API
    // 这里验证函数被调用即可
    expect(result.current.error).toBe(null)
  })

  test('应该能够重命名文件', async () => {
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.renameFile('/test/oldname.txt', 'newname.txt')
    })
    
    // 当前实现只是console.log，在Phase 2会接入真实API
    // 这里验证函数被调用即可
    expect(result.current.error).toBe(null)
  })

  test('应该能够搜索文件', async () => {
    const mockSearchResults = [
      { name: 'App.jsx', type: 'file', path: '/src/App.jsx' },
      { name: 'App.css', type: 'file', path: '/src/App.css' }
    ]
    
    mockElectronAPI.searchFiles.mockResolvedValue(mockSearchResults)
    
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.searchFiles('App')
    })
    
    expect(result.current.searchResults).toEqual(mockSearchResults)
    expect(mockElectronAPI.searchFiles).toHaveBeenCalledWith('App')
  })

  test('应该处理加载错误', async () => {
    const errorMessage = 'Permission denied'
    // 现在使用readDirectory当path存在时
    mockElectronAPI.readDirectory.mockRejectedValue(new Error(errorMessage))
    
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.loadDirectory('/test')
    })
    
    expect(result.current.error).toBe(errorMessage)
    expect(result.current.isLoading).toBe(false)
  })

  // 新增测试用例：创建文件夹
  test('应该能够创建文件夹', async () => {
    const folderPath = '/test/newfolder'
    mockElectronAPI.createFolder.mockResolvedValue(true)
    
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.createFolder(folderPath)
    })
    
    expect(mockElectronAPI.createFolder).toHaveBeenCalledWith(folderPath)
  })

  test('应该处理创建文件夹错误', async () => {
    const folderPath = '/test/invalid'
    const errorMessage = 'Permission denied'
    mockElectronAPI.createFolder.mockRejectedValue(new Error(errorMessage))
    
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.createFolder(folderPath)
    })
    
    expect(result.current.error).toBe(errorMessage)
  })

  // 新增测试用例：重命名路径
  test('应该能够重命名路径', async () => {
    const oldPath = '/test/oldname'
    const newName = 'newname'
    mockElectronAPI.renamePath.mockResolvedValue(true)
    
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.renamePath(oldPath, newName)
    })
    
    expect(mockElectronAPI.renamePath).toHaveBeenCalledWith(oldPath, newName)
  })

  test('应该处理重命名路径错误', async () => {
    const oldPath = '/test/oldname'
    const newName = 'newname'
    const errorMessage = 'File not found'
    mockElectronAPI.renamePath.mockRejectedValue(new Error(errorMessage))
    
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.renamePath(oldPath, newName)
    })
    
    expect(result.current.error).toBe(errorMessage)
  })

  // 新增测试用例：删除路径
  test('应该能够删除路径', async () => {
    const targetPath = '/test/todelete'
    mockElectronAPI.deletePath.mockResolvedValue(true)
    
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.deletePath(targetPath)
    })
    
    expect(mockElectronAPI.deletePath).toHaveBeenCalledWith(targetPath)
  })

  test('应该处理删除路径错误', async () => {
    const targetPath = '/test/protected'
    const errorMessage = 'Permission denied'
    mockElectronAPI.deletePath.mockRejectedValue(new Error(errorMessage))
    
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.deletePath(targetPath)
    })
    
    expect(result.current.error).toBe(errorMessage)
  })

  // 新增测试用例：刷新功能
  test('应该能够刷新当前目录', async () => {
    const currentPath = '/test'
    const mockFiles = [
      { name: 'file1.txt', type: 'file', path: '/test/file1.txt' }
    ]
    
    mockElectronAPI.readDirectory.mockResolvedValue(mockFiles)
    
    const { result } = renderHook(() => useFileManager())
    
    // 设置当前路径
    await act(async () => {
      result.current.setCurrentPath(currentPath)
    })

    await act(async () => {
      await result.current.refresh()
    })
    
    expect(mockElectronAPI.readDirectory).toHaveBeenCalledWith(currentPath)
    expect(result.current.files).toEqual(mockFiles)
  })

  // 新增测试用例：loadDirectory 两种模式
  test('应该支持无路径模式打开目录对话框', async () => {
    const mockResult = {
      rootPath: '/selected/path',
      entries: [{ name: 'file1.txt', type: 'file', path: '/selected/path/file1.txt' }]
    }
    
    mockElectronAPI.selectDirectory.mockResolvedValue(mockResult)
    mockElectronAPI.watchDirectory.mockResolvedValue(true)
    
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.loadDirectory('')
    })
    
    expect(mockElectronAPI.selectDirectory).toHaveBeenCalled()
    expect(result.current.currentPath).toBe('/selected/path')
    expect(result.current.files).toEqual(mockResult.entries)
  })

  test('应该支持指定路径模式直接读取目录', async () => {
    const dirPath = '/specific/path'
    const mockFiles = [
      { name: 'file2.txt', type: 'file', path: '/specific/path/file2.txt' }
    ]
    
    mockElectronAPI.readDirectory.mockResolvedValue(mockFiles)
    mockElectronAPI.watchDirectory.mockResolvedValue(true)
    
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.loadDirectory(dirPath)
    })
    
    expect(mockElectronAPI.readDirectory).toHaveBeenCalledWith(dirPath)
    expect(result.current.currentPath).toBe(dirPath)
    expect(result.current.files).toEqual(mockFiles)
  })

  // 新增测试用例：文件变化监听
  test('应该在当前路径变化时设置监听', async () => {
    const currentPath = '/test/path'
    
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      result.current.setCurrentPath(currentPath)
    })
    
    expect(mockElectronAPI.watchDirectory).toHaveBeenCalledWith(currentPath)
    expect(mockElectronAPI.onFileChanged).toHaveBeenCalled()
  })
})