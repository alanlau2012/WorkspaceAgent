import React, { useState, useEffect, useCallback } from 'react'
// import './FilePreview.css'

export const FilePreview = ({ file }) => {
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const getFileType = useCallback((filename) => {
    const ext = filename.split('.').pop().toLowerCase()
    return ext
  }, [])

  const isImageFile = useCallback((filename) => {
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
    return imageExts.includes(getFileType(filename))
  }, [getFileType])

  const isCodeFile = useCallback((filename) => {
    const codeExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'scss', 'less', 'json', 'xml', 'yaml', 'yml']
    return codeExts.includes(getFileType(filename))
  }, [getFileType])

  const isTextFile = useCallback((filename) => {
    const textExts = ['txt', 'md', 'log', 'csv']
    return textExts.includes(getFileType(filename))
  }, [getFileType])

  useEffect(() => {
    if (!file) {
      setContent('')
      setError(null)
      setIsLoading(false)
      return
    }

    // Check if file type is supported before loading
    if (!isCodeFile(file.name) && !isTextFile(file.name) && !isImageFile(file.name)) {
      setContent('')
      setError(null)
      setIsLoading(false)
      return
    }

    const loadFileContent = async () => {
      setIsLoading(true)
      setError(null)

      try {
        if (window.electronAPI && window.electronAPI.readFile) {
          const fileContent = await window.electronAPI.readFile(file.path)
          setContent(fileContent)
        } else {
          // Mock content for testing
          const mockContent = `// 文件内容预览\n// 文件路径: ${file.path}\n// 这是一个模拟的文件内容，用于测试目的。\n\nconsole.log('Hello, World!');\n\n// 在实际的Electron环境中，这里会显示真实的文件内容。`
          setContent(mockContent)
        }
      } catch (err) {
        if (String(err.message).includes('FILE_TOO_LARGE')) {
          setError('文件过大，无法预览 (>1MB)')
        } else {
          setError(`文件读取失败: ${err.message}`)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadFileContent()
  }, [file, isCodeFile, isTextFile, isImageFile])

  const renderContent = () => {
    if (!file) {
      return <div className="file-preview-empty">请选择一个文件进行预览</div>
    }

    if (isLoading) {
      return <div className="file-preview-loading">加载中...</div>
    }

    if (error) {
      return <div className="file-preview-error">{error}</div>
    }

    if (isImageFile(file.name)) {
      return (
        <div className="file-preview-image">
          <img src={content} alt={file.name} />
        </div>
      )
    }

    if (isCodeFile(file.name) || isTextFile(file.name)) {
      return (
        <div className="file-preview-code">
          <pre><code>{content}</code></pre>
        </div>
      )
    }

    return (
      <div className="file-preview-unsupported">
        不支持预览此文件类型
      </div>
    )
  }

  return (
    <div className="file-preview">
      {file && (
        <div className="file-preview-header">
          <h3>{file.name}</h3>
          <span className="file-path">{file.path}</span>
        </div>
      )}
      <div className="file-preview-content">
        {renderContent()}
      </div>
    </div>
  )
}