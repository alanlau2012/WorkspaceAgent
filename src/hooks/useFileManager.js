import { useState, useCallback } from 'react'

export const useFileManager = () => {
  const [files, setFiles] = useState([])
  const [currentPath, setCurrentPath] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchResults, setSearchResults] = useState([])

  const loadDirectory = useCallback(async (path) => {
    setIsLoading(true)
    setError(null)
    
    try {
      if (window.electron && window.electron.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('load-directory', path)
        setFiles(result)
        setCurrentPath(path)
      } else {
        // Mock data for testing
        const mockFiles = [
          { name: 'file1.txt', type: 'file', path: `${path}/file1.txt` },
          { name: 'folder1', type: 'directory', path: `${path}/folder1` }
        ]
        setFiles(mockFiles)
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
      if (window.electron && window.electron.ipcRenderer) {
        await window.electron.ipcRenderer.invoke('create-file', filePath)
      }
      // Refresh the current directory
      await loadDirectory(currentPath)
    } catch (err) {
      setError(err.message)
    }
  }, [currentPath, loadDirectory])

  const deleteFile = useCallback(async (filePath) => {
    try {
      if (window.electron && window.electron.ipcRenderer) {
        await window.electron.ipcRenderer.invoke('delete-file', filePath)
      }
      // Refresh the current directory
      await loadDirectory(currentPath)
    } catch (err) {
      setError(err.message)
    }
  }, [currentPath, loadDirectory])

  const renameFile = useCallback(async (oldPath, newName) => {
    try {
      if (window.electron && window.electron.ipcRenderer) {
        await window.electron.ipcRenderer.invoke('rename-file', {
          oldPath,
          newName
        })
      }
      // Refresh the current directory
      await loadDirectory(currentPath)
    } catch (err) {
      setError(err.message)
    }
  }, [currentPath, loadDirectory])

  const searchFiles = useCallback(async (query) => {
    try {
      if (window.electron && window.electron.ipcRenderer) {
        const results = await window.electron.ipcRenderer.invoke('search-files', query)
        setSearchResults(results)
      } else {
        // Mock search results for testing
        const mockResults = [
          { name: 'test1.txt', type: 'file', path: '/test/test1.txt' },
          { name: 'test2.js', type: 'file', path: '/test/test2.js' }
        ]
        setSearchResults(mockResults)
      }
    } catch (err) {
      setError(err.message)
    }
  }, [])

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