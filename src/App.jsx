import React, { useState } from 'react'
import { Layout } from 'antd'
import { FileTree } from './components/FileTree'
import { FilePreview } from './components/FilePreview'
import { Toolbar } from './components/Toolbar'
import './App.css'
import './styles/layout.css'

const { Sider, Content } = Layout

function App() {
  const [selectedFile, setSelectedFile] = useState(null)

  const handleFileSelect = (file) => {
    setSelectedFile(file)
  }

  return (
    <div className="App">
      <Layout style={{ height: '100vh' }}>
        <Sider width={300} style={{ background: '#fff' }}>
          <Toolbar />
          <FileTree 
            onFileSelect={handleFileSelect}
            showSearch={true}
          />
        </Sider>
        <Content style={{ padding: '16px' }}>
          <FilePreview file={selectedFile} />
        </Content>
      </Layout>
    </div>
  )
}

export default App