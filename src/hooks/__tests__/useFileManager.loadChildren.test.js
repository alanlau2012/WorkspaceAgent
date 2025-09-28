import { renderHook, act } from '@testing-library/react'
import { useFileManager } from '../useFileManager'

// Mock electronAPI
const mockElectronAPI = {
  readChildren: jest.fn(),
}

beforeEach(() => {
  global.window = {
    electronAPI: mockElectronAPI
  }
  jest.clearAllMocks()
})

afterEach(() => {
  delete global.window
})

describe('useFileManager - loadChildren', () => {
  test('should load children for a directory', async () => {
    const mockChildren = [
      { name: 'child1.txt', type: 'file', path: '/test/child1.txt' },
      { name: 'child2.txt', type: 'file', path: '/test/child2.txt' }
    ]
    
    mockElectronAPI.readChildren.mockResolvedValue(mockChildren)
    
    const { result } = renderHook(() => useFileManager())
    
    // 调用loadChildren
    await act(async () => {
      await result.current.loadChildren('/test')
    })
    
    expect(mockElectronAPI.readChildren).toHaveBeenCalledWith('/test')
    expect(result.current.loadedPaths.has('/test')).toBe(true)
  })

  test('should handle loading errors', async () => {
    const errorMessage = 'Failed to load children'
    mockElectronAPI.readChildren.mockRejectedValue(new Error(errorMessage))
    
    const { result } = renderHook(() => useFileManager())
    
    await act(async () => {
      await result.current.loadChildren('/test')
    })
    
    expect(result.current.error).toBe(errorMessage)
  })

  test('should work without electronAPI (fallback)', async () => {
    delete global.window.electronAPI
    
    const { result } = renderHook(() => useFileManager())
    
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    
    await act(async () => {
      await result.current.loadChildren('/test')
    })
    
    expect(consoleSpy).toHaveBeenCalledWith('懒加载目录:', '/test')
    
    consoleSpy.mockRestore()
  })
})