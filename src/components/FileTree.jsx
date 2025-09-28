import React, { useState } from 'react'
import { useFileManagerCtx } from '../contexts/FileManagerContext'
import './FileTree.css'

export const FileTree = ({ onFileSelect, showSearch = false }) => {
  const {
    files,
    isLoading,
    error,
    searchFiles,
    searchResults,
    renamePath,
    deletePath
  } = useFileManagerCtx()

  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState(new Set())
  const [menu, setMenu] = useState({ visible: false, x: 0, y: 0, target: null })

  const handleSearchChange = (e) => {
    const query = e.target.value
    setSearchQuery(query)
    if (query.trim()) {
      searchFiles(query)
    }
  }

  const toggleFolder = (folderPath) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath)
    } else {
      newExpanded.add(folderPath)
    }
    setExpandedFolders(newExpanded)
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
        renamePath(menu.target.path, newName)
      }
    } else if (action === 'delete') {
      const confirmed = window.confirm(`确认删除 ${menu.target.name} ?`)
      if (confirmed) {
        deletePath(menu.target.path)
      }
    }

    setMenu({ visible: false, x: 0, y: 0, target: null })
  }

  const hideMenu = () => {
    setMenu({ visible: false, x: 0, y: 0, target: null })
  }

  const renderFileItem = (file, level = 0) => {
    const isExpanded = expandedFolders.has(file.path)
    const hasChildren = file.children && file.children.length > 0

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
              {hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
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
          style={{ left: menu.x, top: menu.y }}
          onMouseLeave={hideMenu}
        >
          <div 
            className="menu-item" 
            onClick={() => handleMenuAction('rename')}
          >
            重命名
          </div>
          <div 
            className="menu-item danger" 
            onClick={() => handleMenuAction('delete')}
          >
            删除
          </div>
        </div>
      )}
    </div>
  )
}