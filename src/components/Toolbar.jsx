import React from 'react'
import { useFileManager } from '../hooks/useFileManager'
import './Toolbar.css'

export const Toolbar = () => {
  const { loadDirectory, currentPath } = useFileManager()

  const handleOpenFolder = async () => {
    await loadDirectory('')
  }

  const handleRefresh = async () => {
    if (currentPath) {
      await loadDirectory(currentPath)
    }
  }

  const handleNewFile = () => {
    // TODO: 实现新建文件功能
    console.log('新建文件')
  }

  return (
    <div className="file-tree-toolbar">
      <button 
        className="toolbar-btn" 
        onClick={handleOpenFolder}
        title="打开文件夹"
      >
        <span className="toolbar-icon">📁</span>
        <span className="toolbar-label">打开</span>
      </button>
      
      <button 
        className="toolbar-btn" 
        onClick={handleRefresh}
        title="刷新"
      >
        <span className="toolbar-icon">🔄</span>
        <span className="toolbar-label">刷新</span>
      </button>
      
      <button 
        className="toolbar-btn" 
        onClick={handleNewFile}
        title="新建文件"
      >
        <span className="toolbar-icon">📄</span>
        <span className="toolbar-label">新建</span>
      </button>
      
      {currentPath && (
        <div className="current-path" title={currentPath}>
          {currentPath}
        </div>
      )}
    </div>
  )
}