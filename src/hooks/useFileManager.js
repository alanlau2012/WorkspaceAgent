import { useState, useCallback, useEffect } from 'react'

export const useFileManager = () => {
  const [files, setFiles] = useState([])
  const [currentPath, setCurrentPath] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchResults, setSearchResults] = useState([])

  // 初始化时加载模拟数据
  useEffect(() => {
    const mockFiles = [
      {
        name: 'src',
        type: 'directory',
        path: '/src',
        children: [
          {
            name: 'components',
            type: 'directory',
            path: '/src/components',
            children: [
              { name: 'FileTree.jsx', type: 'file', path: '/src/components/FileTree.jsx' },
              { name: 'FilePreview.jsx', type: 'file', path: '/src/components/FilePreview.jsx' },
              { name: 'FileTree.css', type: 'file', path: '/src/components/FileTree.css' },
              { name: 'FilePreview.css', type: 'file', path: '/src/components/FilePreview.css' }
            ]
          },
          {
            name: 'hooks',
            type: 'directory',
            path: '/src/hooks',
            children: [
              { name: 'useFileManager.js', type: 'file', path: '/src/hooks/useFileManager.js' }
            ]
          },
          { name: 'App.jsx', type: 'file', path: '/src/App.jsx' },
          { name: 'App.css', type: 'file', path: '/src/App.css' },
          { name: 'index.js', type: 'file', path: '/src/index.js' },
          { name: 'main.js', type: 'file', path: '/src/main.js' }
        ]
      },
      {
        name: 'docs',
        type: 'directory',
        path: '/docs',
        children: [
          { name: 'README.md', type: 'file', path: '/docs/README.md' },
          { name: 'Roadmap.md', type: 'file', path: '/docs/Roadmap.md' }
        ]
      },
      { name: 'package.json', type: 'file', path: '/package.json' },
      { name: 'vite.config.js', type: 'file', path: '/vite.config.js' },
      { name: 'README.md', type: 'file', path: '/README.md' }
    ]
    setFiles(mockFiles)
  }, [])

  const loadDirectory = useCallback(async (path) => {
    setIsLoading(true)
    setError(null)
    
    try {
      if (window.electronAPI && window.electronAPI.selectDirectory) {
        const result = await window.electronAPI.selectDirectory()
        setFiles(result)
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