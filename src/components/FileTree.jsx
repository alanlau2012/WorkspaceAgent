import React, { useState } from 'react'
import { useFileManager } from '../hooks/useFileManager'
// import './FileTree.css'

export const FileTree = ({ onFileSelect, showSearch = false }) => {
  const {
    files,
    isLoading,
    error,
    searchFiles,
    searchResults,
    loadChildren,
    deleteFile,
    renameFile
  } = useFileManager()

  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState(new Set())
  const [loadingFolders, setLoadingFolders] = useState(new Set())
  const [menu, setMenu] = useState({ visible: false, x: 0, y: 0, target: null })

  const handleSearchChange = (e) => {
    const query = e.target.value
    setSearchQuery(query)
    if (query.trim()) {
      searchFiles(query)
    }
  }

  const toggleFolder = async (folderPath) => {
    const newExpanded = new Set(expandedFolders)
    const isExpanding = !newExpanded.has(folderPath)

    if (isExpanding) {
      newExpanded.add(folderPath)
      setExpandedFolders(newExpanded)

      // 检查是否需要加载子目录
      const findFile = (files, path) => {
        for (const file of files) {
          if (file.path === path) return file
          if (file.children) {
            const found = findFile(file.children, path)
            if (found) return found
          }
        }
        return null
      }

      const folder = findFile(files, folderPath)
      if (folder && folder.isDirectory && (!folder.children || folder.children.length === 0)) {
        setLoadingFolders(prev => new Set([...prev, folderPath]))
        try {
          await loadChildren(folderPath)
        } catch (error) {
          console.error('加载子目录失败:', error)
        } finally {
          setLoadingFolders(prev => {
            const newSet = new Set(prev)
            newSet.delete(folderPath)
            return newSet
          })
        }
      }
    } else {
      newExpanded.delete(folderPath)
      setExpandedFolders(newExpanded)
    }
  }

  const handleFileClick = (file) => {
    if (file.type === 'directory') {
      toggleFolder(file.path)
    } else if (onFileSelect) {
      onFileSelect(file)
    }
  }

  const handleContextMenu = (e, file) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      target: file
    })
  }

  const handleMenuAction = (action) => {
    if (!menu.target) return

    if (action === 'rename') {
      const newName = window.prompt('新名称：', menu.target.name)
      if (newName && newName !== menu.target.name) {
        // 校验新名称
        if (validateFileName(newName)) {
          const newPath = getNewPath(menu.target.path, newName)
          renameFile(menu.target.path, newName)
        } else {
          alert('文件名不能包含路径分隔符 (/ 或 \\) 或其他非法字符')
        }
      }
    } else if (action === 'delete') {
      const confirmed = window.confirm(`确认删除 ${menu.target.name} ?`)
      if (confirmed) {
        deleteFile(menu.target.path)
      }
    }

    setMenu({ visible: false, x: 0, y: 0, target: null })
  }

  const validateFileName = (fileName) => {
    // 禁止包含路径分隔符和其他非法字符
    const illegalChars = /[<>:"|?*\\\/]/
    return fileName && fileName.trim() && !illegalChars.test(fileName)
  }

  const getNewPath = (oldPath, newName) => {
    const pathParts = oldPath.split(/[/\\]/)
    pathParts[pathParts.length - 1] = newName
    return pathParts.join('/')
  }

  const hideMenu = () => {
    setMenu({ visible: false, x: 0, y: 0, target: null })
  }

  const renderFileItem = (file, level = 0) => {
    const isExpanded = expandedFolders.has(file.path)
    const hasChildren = file.children && file.children.length > 0
    const isLoading = loadingFolders.has(file.path)

    return (
      <div key={file.path} className="file-item">
        <div
          className={`file-row level-${level} ${file.type}`}
          onClick={() => handleFileClick(file)}
          onContextMenu={(e) => handleContextMenu(e, file)}
          style={{ paddingLeft: `${level * 20 + 10}px` }}
        >
          {(file.type === 'directory' || file.isDirectory) && (
            <span className="folder-toggle">
              {isLoading ? '⏳' : (hasChildren ? (isExpanded ? '▼' : '▶') : '•')}
            </span>
          )}
          <span className="file-icon">
            {(file.type === 'directory' || file.isDirectory) ? '📁' : '📄'}
          </span>
          <span className="file-name">{file.name}</span>
        </div>
        {(file.type === 'directory' || file.isDirectory) && isExpanded && hasChildren && (
          <div className="folder-children">
            {file.children.map(child => renderFileItem(child, level + 1))}
          </div>
        )}
        {(file.type === 'directory' || file.isDirectory) && isExpanded && !hasChildren && isLoading && (
          <div className="folder-children" style={{ paddingLeft: `${(level + 1) * 20 + 10}px`, color: '#666' }}>
            加载中...
          </div>
        )}
      </div>
    )
  }

  const displayFiles = searchQuery.trim() ? searchResults : files

  if (isLoading) {
    return <div className="file-tree-loading">加载中...</div>
  }

  if (error) {
    return <div className="file-tree-error">{error}</div>
  }

  return (
    <div className="file-tree" onClick={hideMenu}>
      {showSearch && (
        <div className="file-tree-search">
          <input
            type="text"
            placeholder="搜索文件..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
      )}
      <div className="file-tree-content">
        {displayFiles.map(file => renderFileItem(file))}
      </div>
      {menu.visible && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            left: menu.x,
            top: menu.y,
            zIndex: 1000,
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            minWidth: '120px'
          }}
        >
          <div
            className="context-menu-item"
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              borderBottom: '1px solid #eee'
            }}
            onClick={() => handleMenuAction('rename')}
          >
            重命名
          </div>
          <div
            className="context-menu-item"
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              color: '#ff4444'
            }}
            onClick={() => handleMenuAction('delete')}
          >
            删除
          </div>
        </div>
      )}
    </div>
  )
}