import React from 'react'
import './ChatMessage.css'

export const ChatMessage = ({ message, onRetry }) => {
  const { type, content, model, timestamp, isError, context } = message

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const renderContent = () => {
    // 处理多行内容
    const lines = content.split('\n')
    return lines.map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < lines.length - 1 && <br />}
      </React.Fragment>
    ))
  }

  return (
    <div className={`chat-message ${type} ${isError ? 'error' : ''}`}>
      <div className="message-header">
        <div className="message-avatar">
          {type === 'user' ? '👤' : '🤖'}
        </div>
        <div className="message-info">
          <span className="message-sender">
            {type === 'user' ? '你' : (model || 'AI助手')}
          </span>
          <span className="message-time">
            {formatTime(timestamp)}
          </span>
        </div>
      </div>
      
      <div className="message-content">
        {renderContent()}
      </div>

      {/* 上下文信息 */}
      {context && (
        <div className="message-context">
          <div className="context-label">📎 上下文:</div>
          {context.files && context.files.length > 0 && (
            <div className="context-files">
              {context.files.map((file, index) => (
                <span key={index} className="context-file">
                  {file.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 错误重试 */}
      {isError && onRetry && (
        <div className="message-actions">
          <button 
            className="retry-btn"
            onClick={() => onRetry(message)}
            title="重试发送"
          >
            🔄 重试
          </button>
        </div>
      )}
    </div>
  )
}
