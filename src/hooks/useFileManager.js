import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export function useFileManager() {
  const [files, setFiles] = useState([])
  const [currentPath, setCurrentPath] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!currentPath) return
    if (window.electronAPI?.readDirectory) {
      const list = await window.electronAPI.readDirectory(currentPath)
      setFiles(list)
    }
  }, [currentPath])

  const createFolder = useCallback(async (dirPath) => {
    await window.electronAPI?.createFolder?.(dirPath)
    await refresh()
  }, [refresh])

  const deletePath = useCallback(async (p) => {
    await window.electronAPI?.deletePath?.(p)
    await refresh()
  }, [refresh])

  const renamePath = useCallback(async (oldPath, newName) => {
    await window.electronAPI?.renamePath?.(oldPath, newName)
    await refresh()
  }, [refresh])

  const loadDirectory = useCallback(async (path) => {
    setIsLoading(true)
    setError(null)
    try {
      if (!path) {
        if (window.electronAPI?.selectDirectory) {
          const result = await window.electronAPI.selectDirectory()
          if (Array.isArray(result)) {
            // dialog canceled
            return
          }
          setCurrentPath(result.rootPath)
          setFiles(result.entries)
        } else {
          // jest 环境下提供少量 mock
          setCurrentPath('/mock')
          setFiles([])
        }
      } else {
        if (window.electronAPI?.readDirectory) {
          const list = await window.electronAPI.readDirectory(path)
          setCurrentPath(path)
          setFiles(list)
        }
      }
    } catch (e) {
      setError(e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!currentPath || !window.electronAPI?.watchDirectory) return
    window.electronAPI.watchDirectory(currentPath)
    const handler = () => refresh()
    window.electronAPI.onFileChanged(handler)
    return () => {
      window.electronAPI.removeFileChangedListener(handler)
      window.electronAPI.stopWatching?.()
    }
  }, [currentPath, refresh])

  // 兼容旧方法名
  const createFile = createFolder
  const deleteFile = deletePath
  const renameFile = renamePath

  return {
    files,
    currentPath,
    isLoading,
    error,
    loadDirectory,
    refresh,
    createFolder,
    deletePath,
    renamePath,
    createFile,
    deleteFile,
    renameFile,
  }
}

