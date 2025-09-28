import { renderHook, act } from '@testing-library/react'
import { useFileManager } from '../useFileManager'

describe('useFileManager 重命名输入校验', () => {
  test('名称包含路径分隔符应报错', async () => {
    const { result } = renderHook(() => useFileManager())

    await act(async () => {
      await result.current.renameFile('/test/a.txt', 'bad/name')
    })

    expect(result.current.error).toBe('名称不能包含路径分隔符 / 或 \\')
  })

  test('名称为空应报错', async () => {
    const { result } = renderHook(() => useFileManager())

    await act(async () => {
      await result.current.renameFile('/test/a.txt', '   ')
    })

    expect(result.current.error).toBe('名称不能为空')
  })
})

