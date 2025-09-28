import React, { useState, useEffect, useCallback } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import { isImage, isCode, isText, languageOf } from '../utils/languageMapping'
import './FilePreview.css'

const MAX_LINES = 2000

export const FilePreview = ({ file }) => {
  const [content, setContent] = useState('')
  const [meta, setMeta] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadFileContent = useCallback(async () => {
    if (!file) { 
      setContent('')
      setMeta({})
      setError(null)
      setIsLoading(false)
      return 
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const res = await (window.electronAPI?.readFile?.(file.path) ?? Promise.resolve(''))
      
      // Handle both new object format and old string format for backward compatibility
      const data = typeof res === 'string' ? { 
        type: isImage(file.name) ? 'image' : 'text', 
        content: res 
      } : res
      
      // Handle error responses
      if (data.error) {
        setError(`文件读取失败: ${data.error === 'IMAGE_TOO_LARGE' ? '图片文件太大' : data.error}`)
        return
      }
      
      setMeta(data)
      setContent(data.content || '')
    } catch (e) {
      setError(`文件读取失败: ${e.message}`)
    } finally { 
      setIsLoading(false) 
    }
  }, [file])

  useEffect(() => { 
    loadFileContent() 
  }, [loadFileContent])

  const renderContent = () => {
    if (!file) return <div className="file-preview-empty">请选择一个文件进行预览</div>
    if (isLoading) return <div className="file-preview-loading">加载中...</div>
    if (error) return <div className="file-preview-error">{error}</div>

    if (isImage(file.name)) {
      return (
        <div className="file-preview-image">
          <img src={content} alt={file.name} />
        </div>
      )
    }

    if (isCode(file.name) || isText(file.name)) {
      const lang = languageOf(file.name)
      const lines = content.split('\n')
      const truncated = meta.truncated || lines.length > MAX_LINES
      const display = truncated ? lines.slice(0, MAX_LINES).join('\n') + '\n...（已截断预览）' : content
      
      return (
        <div className="file-preview-code">
          <SyntaxHighlighter language={lang} style={oneDark}>
            {display}
          </SyntaxHighlighter>
        </div>
      )
    }

    return <div className="file-preview-unsupported">不支持预览此文件类型</div>
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