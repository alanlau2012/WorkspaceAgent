import { useState, useCallback, useEffect } from 'react'

export const useFileManager = () => {
  const [files, setFiles] = useState([])
  const [currentPath, setCurrentPath] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchResults, setSearchResults] = useState([])

  // 移除初始化 mock，改为按需加载

  const loadDirectory = useCallback(async (path) => {
    setIsLoading(true)
    setError(null)
    
    try {
      if (window.electronAPI && window.electronAPI.selectDirectory) {
        const result = await window.electronAPI.selectDirectory()
        const tree = Array.isArray(result) ? result : (result && result.tree) || []
        setFiles(tree)
        setCurrentPath(path)
      } else {
        // Mock data for testing - 使用现有的模拟数据
        setCurrentPath(path)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createFile = useCallback(async (filePath) => {
    try {
      if (window.electronAPI && window.electronAPI.writeFile) {
        await window.electronAPI.writeFile(filePath, '')
      }
      // Refresh the current directory
      await loadDirectory(currentPath)
    } catch (err) {
      setError(err.message)
    }
  }, [currentPath, loadDirectory])

  const deleteFile = useCallback(async (filePath) => {
    try {
      // 在实际的Electron环境中，这里会调用删除文件的API
      console.log('删除文件:', filePath)
      // Refresh the current directory
      await loadDirectory(currentPath)
    } catch (err) {
      setError(err.message)
    }
  }, [currentPath, loadDirectory])

  const renameFile = useCallback(async (oldPath, newName) => {
    try {
      // 在实际的Electron环境中，这里会调用重命名文件的API
      console.log('重命名文件:', oldPath, '->', newName)
      // Refresh the current directory
      await loadDirectory(currentPath)
    } catch (err) {
      setError(err.message)
    }
  }, [currentPath, loadDirectory])

  const searchFiles = useCallback(async (query) => {
    try {
      if (window.electronAPI && window.electronAPI.searchFiles) {
        // 在实际的Electron环境中，这里会调用搜索API
        const results = await window.electronAPI.searchFiles(query)
        setSearchResults(results)
      } else {
        // Mock search results for testing - 在现有文件中搜索
        console.log('搜索文件:', query)
        const searchInFiles = (files, query) => {
          const results = []
          files.forEach(file => {
            if (file.name.toLowerCase().includes(query.toLowerCase())) {
              results.push(file)
            }
            if (file.children) {
              results.push(...searchInFiles(file.children, query))
            }
          })
          return results
        }
        const mockResults = searchInFiles(files, query)
        setSearchResults(mockResults)
      }
    } catch (err) {
      setError(err.message)
    }
  }, [files])

  // 监听文件变化并在卸载时清理
  useEffect(() => {
    if (!window.electronAPI || !window.electronAPI.onFileChanged) return

    const handleChange = () => {
      // 变更后刷新当前目录
      if (currentPath) {
        loadDirectory(currentPath)
      }
    }

    window.electronAPI.onFileChanged(handleChange)
    return () => {
      if (window.electronAPI.stopWatching) {
        window.electronAPI.stopWatching()
      }
      if (window.electronAPI.removeFileChangedListener) {
        window.electronAPI.removeFileChangedListener(handleChange)
      }
    }
  }, [currentPath, loadDirectory])

  return {
    files,
    currentPath,
    isLoading,
    error,
    searchResults,
    loadDirectory,
    createFile,
    deleteFile,
    renameFile,
    searchFiles
  }
}