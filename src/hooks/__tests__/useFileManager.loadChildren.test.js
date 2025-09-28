import { renderHook, act } from '@testing-library/react'
import { useFileManager } from '../useFileManager'

const mockElectronAPI = {
  selectDirectory: jest.fn(),
  readChildren: jest.fn()
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

describe('useFileManager.loadChildren 懒加载子目录', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('能为指定目录按需加载 children 并更新状态', async () => {
    const initial = [
      { name: 'src', type: 'directory', path: '/src', children: [
        { name: 'components', type: 'directory', path: '/src/components', children: [] }
      ]}
    ]

    mockElectronAPI.selectDirectory.mockResolvedValue(initial)
    mockElectronAPI.readChildren.mockResolvedValue([
      { name: 'FileTree.jsx', type: 'file', path: '/src/components/FileTree.jsx' }
    ])

    const { result } = renderHook(() => useFileManager())

    await act(async () => {
      await result.current.loadDirectory('/src')
    })

    await act(async () => {
      await result.current.loadChildren('/src/components')
    })

    const targetDir = result.current.files[0].children[0]
    expect(targetDir.children.length).toBe(1)
    expect(targetDir.children[0].name).toBe('FileTree.jsx')
  })
})

