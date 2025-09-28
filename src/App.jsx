import React, { useState } from 'react'
import { FileTree } from './components/FileTree'
import { FilePreview } from './components/FilePreview'
import { ChatPanel } from './components/Chat/ChatPanel'
import './App.css'

function App() {
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
            <div className="file-tree-toolbar">
              <button className="toolbar-btn">📁 打开</button>
              <button className="toolbar-btn">🔄 刷新</button>
              <button className="toolbar-btn">➕ 新建</button>
            </div>
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

export default App