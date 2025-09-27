import React, { useState } from 'react'
import { useFileManager } from '../hooks/useFileManager'
// import './FileTree.css'

export const FileTree = ({ onFileSelect, showSearch = false }) => {
  const {
    files,
    isLoading,
    error,
    searchFiles,
    searchResults
  } = useFileManager()

  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState(new Set())

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

  const renderFileItem = (file, level = 0) => {
    const isExpanded = expandedFolders.has(file.path)
    const hasChildren = file.children && file.children.length > 0

    return (
      <div key={file.path} className="file-item">
        <div
          className={`file-row level-${level} ${file.type}`}
          onClick={() => handleFileClick(file)}
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
    <div className="file-tree">
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
    </div>
  )
}