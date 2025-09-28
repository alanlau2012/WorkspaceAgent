import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { useFileManager } from '../useFileManager'

describe('useFileManager', () => {
  beforeEach(() => {
    // @ts-ignore
    global.window = {}
  })

  test('loadDirectory("") uses selectDirectory and sets state', async () => {
    const entries = [{ name: 'a.txt', type: 'file', path: 'C:/a.txt' }]
    // @ts-ignore
    window.electronAPI = {
      selectDirectory: jest.fn(async () => ({ rootPath: 'C:/root', entries })),
      readDirectory: jest.fn(),
      watchDirectory: jest.fn(),
      onFileChanged: jest.fn(),
      removeFileChangedListener: jest.fn(),
      stopWatching: jest.fn()
    }

    const { result } = renderHook(() => useFileManager())
    await act(async () => {
      await result.current.loadDirectory('')
    })
    expect(result.current.currentPath).toBe('C:/root')
    expect(result.current.files).toEqual(entries)
  })

  test('loadDirectory(path) calls readDirectory', async () => {
    const entries = [{ name: 'sub', type: 'directory', path: 'C:/root/sub', children: [] }]
    // @ts-ignore
    window.electronAPI = {
      readDirectory: jest.fn(async () => entries),
      watchDirectory: jest.fn(),
      onFileChanged: jest.fn(),
      removeFileChangedListener: jest.fn(),
      stopWatching: jest.fn()
    }
    const { result } = renderHook(() => useFileManager())
    await act(async () => {
      await result.current.loadDirectory('C:/root')
    })
    expect(window.electronAPI.readDirectory).toHaveBeenCalledWith('C:/root')
    expect(result.current.currentPath).toBe('C:/root')
    expect(result.current.files).toEqual(entries)
  })

  test('createFolder/renamePath/deletePath call IPC then refresh', async () => {
    const initial = [{ name: 'x', type: 'file', path: 'C:/root/x' }]
    const after = [{ name: 'y', type: 'file', path: 'C:/root/y' }]
    const readDirectory = jest.fn(async () => after)
    // @ts-ignore
    window.electronAPI = {
      readDirectory,
      createFolder: jest.fn(async () => true),
      renamePath: jest.fn(async () => true),
      deletePath: jest.fn(async () => true),
      watchDirectory: jest.fn(),
      onFileChanged: jest.fn(),
      removeFileChangedListener: jest.fn(),
      stopWatching: jest.fn()
    }
    const { result } = renderHook(() => useFileManager())
    await act(async () => {
      await result.current.loadDirectory('C:/root')
    })
    await act(async () => {
      await result.current.createFolder('C:/root/new')
      await result.current.renamePath('C:/root/y', 'z')
      await result.current.deletePath('C:/root/z')
    })
    expect(window.electronAPI.createFolder).toHaveBeenCalled()
    expect(window.electronAPI.renamePath).toHaveBeenCalled()
    expect(window.electronAPI.deletePath).toHaveBeenCalled()
    expect(readDirectory).toHaveBeenCalledTimes(4) // load + 3 refresh
    expect(result.current.files).toEqual(after)
  })

  test('watchDirectory hooks and triggers refresh on change', async () => {
    const entries = [{ name: 'a', type: 'file', path: 'C:/root/a' }]
    let changeHandler
    // @ts-ignore
    window.electronAPI = {
      readDirectory: jest.fn(async () => entries),
      watchDirectory: jest.fn(),
      onFileChanged: jest.fn((cb) => { changeHandler = cb }),
      removeFileChangedListener: jest.fn(),
      stopWatching: jest.fn()
    }
    const { result } = renderHook(() => useFileManager())
    await act(async () => {
      await result.current.loadDirectory('C:/root')
    })
    expect(window.electronAPI.watchDirectory).toHaveBeenCalledWith('C:/root')
    await act(async () => {
      changeHandler && changeHandler()
    })
    expect(window.electronAPI.readDirectory).toHaveBeenCalledWith('C:/root')
  })
})

