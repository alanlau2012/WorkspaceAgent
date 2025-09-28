import React, { useState } from 'react'
import { Layout } from 'antd'
import { FileTree } from './components/FileTree'
import { FilePreview } from './components/FilePreview'
import { FileManagerProvider, useFileManagerCtx } from './contexts/FileManagerContext'
import './App.css'

const { Sider, Content, Header } = Layout

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
    <Layout style={{ height: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 16px', borderBottom: '1px solid #d9d9d9' }}>
        <Toolbar />
      </Header>
      <Layout>
        <Sider width={300} style={{ background: '#fff' }}>
          <FileTree 
            onFileSelect={handleFileSelect}
            showSearch={true}
          />
        </Sider>
        <Content style={{ padding: '16px' }}>
          <FilePreview file={selectedFile} />
        </Content>
      </Layout>
    </Layout>
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