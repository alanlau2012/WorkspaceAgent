import React, { useState } from 'react'
import { FileTree } from './components/FileTree'
import { FilePreview } from './components/FilePreview'
import { ChatPanel } from './components/Chat/ChatPanel'
import './App.css'
import './styles/layout.css'

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [currentPath, setCurrentPath] = useState('')

  const handleFileSelect = (file) => {
    setSelectedFile(file)
  }

  return (
    <div className="App">
      <div className="main-content">
        <div className="file-tree-panel">
          <div className="file-tree-toolbar">
            <button className="toolbar-btn" onClick={() => window.electronAPI?.selectDirectory()}>
              📁 打开
            </button>
            <button className="toolbar-btn" onClick={() => window.location.reload()}>
              🔄 刷新
            </button>
            <button className="toolbar-btn" onClick={() => console.log('新建文件')}>
              ➕ 新建
            </button>
            <div className="current-path">
              {currentPath || '未选择目录'}
            </div>
          </div>
          <FileTree
            onFileSelect={handleFileSelect}
            showSearch={true}
          />
        </div>
        <div className="preview-panel">
          <div className="preview-content">
            <FilePreview file={selectedFile} />
          </div>
        </div>
        <div className="chat-panel">
          <ChatPanel />
        </div>
      </div>
    </div>
  )
}

export default App