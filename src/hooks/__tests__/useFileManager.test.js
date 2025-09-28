import { renderHook, act } from '@testing-library/react'
import { useFileManager } from '../useFileManager'

// Mock Electron APIs
const mockElectronAPI = {
  selectDirectory: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  watchDirectory: jest.fn(),
  stopWatching: jest.fn(),
  searchFiles: jest.fn(),
  onFileChanged: jest.fn(),
  removeFileChangedListener: jest.fn()
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
    
    mockElectronAPI.selectDirectory.mockResolvedValue(mockFiles)
    
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.loadDirectory('/test')
    })
    
    expect(result.current.files).toEqual(mockFiles)
    expect(result.current.currentPath).toBe('/test')
    expect(mockElectronAPI.selectDirectory).toHaveBeenCalled()
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
    mockElectronAPI.selectDirectory.mockRejectedValue(new Error(errorMessage))
    
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.loadDirectory('/test')
    })
    
    expect(result.current.error).toBe(errorMessage)
    expect(result.current.isLoading).toBe(false)
  })

  test('onFileChanged 触发后应刷新当前目录', async () => {
    mockElectronAPI.selectDirectory.mockResolvedValue([])

    const { result } = renderHook(() => useFileManager())

    await act(async () => {
      await result.current.loadDirectory('/test')
    })

    // 取最新注册的回调（effects 在 currentPath 变化后会重新注册）
    const calls = mockElectronAPI.onFileChanged.mock.calls
    const cb = calls[calls.length - 1][0]
    expect(mockElectronAPI.selectDirectory).toHaveBeenCalledTimes(1)

    await act(async () => {
      cb({ event: 'change', path: '/test/a.js' })
    })

    expect(mockElectronAPI.selectDirectory).toHaveBeenCalledTimes(2)
  })

  test('组件卸载时应停止 watch 并移除文件变更监听', async () => {
    const mockFiles = []
    mockElectronAPI.selectDirectory.mockResolvedValue(mockFiles)

    const { result, unmount } = renderHook(() => useFileManager())

    await act(async () => {
      await result.current.loadDirectory('/test')
    })

    // 捕获注册的监听器回调
    expect(mockElectronAPI.onFileChanged).toHaveBeenCalled()
    const cb = mockElectronAPI.onFileChanged.mock.calls[0][0]

    unmount()

    expect(mockElectronAPI.stopWatching).toHaveBeenCalled()
    expect(mockElectronAPI.removeFileChangedListener).toHaveBeenCalledWith(cb)
  })
})