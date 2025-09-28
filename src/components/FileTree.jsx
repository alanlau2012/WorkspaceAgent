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
    loadedPaths,
    loadChildren,
    deleteFile,
    renameFile
  } = useFileManager()

  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState(new Set())
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, target: null })

  const handleSearchChange = (e) => {
    const query = e.target.value
    setSearchQuery(query)
    if (query.trim()) {
      searchFiles(query)
    }
  }

  const toggleFolder = async (folderPath) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath)
    } else {
      newExpanded.add(folderPath)
      
      // 懒加载：如果目录未加载且children为空，则加载子项
      const folder = findFileByPath(files, folderPath)
      if (folder && folder.type === 'directory' && 
          (!folder.children || folder.children.length === 0) && 
          !loadedPaths.has(folderPath)) {
        await loadChildren(folderPath)
      }
    }
    setExpandedFolders(newExpanded)
  }

  const findFileByPath = (fileList, targetPath) => {
    for (const file of fileList) {
      if (file.path === targetPath) {
        return file
      }
      if (file.children) {
        const found = findFileByPath(file.children, targetPath)
        if (found) return found
      }
    }
    return null
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
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      target: file
    })
  }

  const handleMenuAction = (action) => {
    if (!contextMenu.target) return

    if (action === 'rename') {
      const newName = window.prompt('新名称：', contextMenu.target.name)
      if (newName && newName !== contextMenu.target.name) {
        renameFile(contextMenu.target.path, newName)
      }
    } else if (action === 'delete') {
      const confirmed = window.confirm(`确认删除 ${contextMenu.target.name} ?`)
      if (confirmed) {
        deleteFile(contextMenu.target.path)
      }
    }

    setContextMenu({ visible: false, x: 0, y: 0, target: null })
  }

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, target: null })
  }

  const renderFileItem = (file, level = 0) => {
    const isExpanded = expandedFolders.has(file.path)
    const hasChildren = file.children && file.children.length > 0
    const isLoadingChildren = file.type === 'directory' && isExpanded && 
                              (!file.children || file.children.length === 0) && 
                              !loadedPaths.has(file.path)

    return (
      <div key={file.path} className="file-item">
        <div
          className={`file-row level-${level} ${file.type}`}
          onClick={() => handleFileClick(file)}
          onContextMenu={(e) => handleContextMenu(e, file)}
          style={{ paddingLeft: `${level * 20 + 10}px` }}
        >
          {file.type === 'directory' && (
            <span className="folder-toggle">
              {isLoadingChildren ? '⏳' : hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
            </span>
          )}
          <span className="file-icon">
            {file.type === 'directory' ? '📁' : '📄'}
          </span>
          <span className="file-name">{file.name}</span>
        </div>
        {file.type === 'directory' && isExpanded && hasChildren && (
          <div className="folder-children">
            {file.children.map(child => renderFileItem(child, level + 1))}
          </div>
        )}
        {isLoadingChildren && (
          <div className="folder-children" style={{ paddingLeft: `${(level + 1) * 20 + 10}px` }}>
            <div className="file-row loading">
              <span className="file-icon">⏳</span>
              <span className="file-name">加载中...</span>
            </div>
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
    <div className="file-tree" onClick={closeContextMenu}>
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
      
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            padding: '4px 0'
          }}
        >
          <div
            className="context-menu-item"
            onClick={() => handleMenuAction('rename')}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              borderBottom: '1px solid #eee'
            }}
          >
            重命名
          </div>
          <div
            className="context-menu-item"
            onClick={() => handleMenuAction('delete')}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              color: '#ff4d4f'
            }}
          >
            删除
          </div>
        </div>
      )}
    </div>
  )
}