import React, { useState } from 'react'
import { FileTree } from './components/FileTree'
import { FilePreview } from './components/FilePreview'
import { ChatPanel } from './components/Chat/ChatPanel'
import { FileManagerProvider, useFileManagerCtx } from './contexts/FileManagerContext'
import './App.css'

function Toolbar() {
  const { loadDirectory, currentPath, refresh, createFolder } = useFileManagerCtx()
  
  const handleCreateFolder = () => {
    const name = window.prompt('新建文件夹名称：')
    if (name && currentPath) {
      // 在当前路径下创建文件夹
      const folderPath = `${currentPath}${currentPath.endsWith('/') ? '' : '/'}${name}`
      createFolder(folderPath)
    } else if (name && !currentPath) {
      alert('请先打开一个工作目录')
    }
  }

  return (
    <div className="file-tree-toolbar">
      <button className="toolbar-btn" onClick={() => loadDirectory('')}>📁 打开</button>
      <button className="toolbar-btn" onClick={() => refresh()}>🔄 刷新</button>
      <button className="toolbar-btn" onClick={handleCreateFolder}>➕ 新建</button>
      {currentPath && (
        <span className="current-path" title={currentPath}>
          当前目录: {currentPath}
        </span>
      )}
    </div>
  )
}

function AppContent() {
  const [selectedFile, setSelectedFile] = useState(null)

  const handleFileSelect = (file) => {
    setSelectedFile(file)
  }

  return (
    <div className="app-container">
      <div className="titlebar">
        <div className="titlebar-title">WorkspaceAgent - AI 文件管理助手</div>
      </div>

      <div className="main-content">
        <aside className="file-tree-panel">
          <div className="file-tree-header">
            <div className="file-tree-title">工作区文件</div>
            <Toolbar />
          </div>

          <FileTree onFileSelect={handleFileSelect} showSearch={true} />
        </aside>

        <section className="preview-panel">
          <div className="preview-header">{/* TODO: render selected file info */}</div>
          <div className="preview-content">
            <FilePreview file={selectedFile} />
          </div>
        </section>

        <aside className="chat-panel">
          <ChatPanel
            context={{
              selectedFile,
              workspacePath: window.__WORKSPACE_PATH__ || ''
            }}
          />
        </aside>
      </div>
    </div>
  )
}

function App() {
  return (
    <div className="App">
      <FileManagerProvider>
        <AppContent />
      </FileManagerProvider>
    </div>
  )
}

export default App