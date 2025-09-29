import React, { useRef, useEffect, useState } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { ChatMessage } from './ChatMessage'
import { ChatModelManager } from './ChatModelManager'
import './ChatPanel.css'

export const ChatPanel = ({ context }) => {
  const {
    messages,
    selectedModel,
    availableModels,
    isStreaming,
    currentInput,
    setSelectedModel,
    setCurrentInput,
    sendMessage,
    clearMessages,
    getMessageStats,
    initModelsFromStorage
  } = useChatStore()

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const [isModelManagerOpen, setIsModelManagerOpen] = useState(false)

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // 聚焦输入框
  useEffect(() => {
    if (!isStreaming && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isStreaming])

  // 初始化自定义模型
  useEffect(() => {
    initModelsFromStorage()
  }, [])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!currentInput.trim() || isStreaming) {
      return
    }

    const messageContent = currentInput.trim()
    setCurrentInput('')
    
    await sendMessage(messageContent, context)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  const handleRetry = async (message) => {
    if (message.type === 'user') {
      await sendMessage(message.content, message.context)
    }
  }

  const handleClearChat = () => {
    if (confirm('确定要清空聊天记录吗？')) {
      clearMessages()
    }
  }

  const stats = getMessageStats()

  return (
    <div className="chat-panel">
      {/* 头部 */}
      <div className="chat-header">
        <div className="chat-title">
          <h3>AI 助手</h3>
          <div className="chat-stats">
            {stats.total > 0 && (
              <span className="message-count">
                {stats.total} 条消息
              </span>
            )}
          </div>
        </div>
        
        {/* 模型选择 */}
        <div className="model-selector">
          <label htmlFor="model-select">模型:</label>
          <select
            id="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={isStreaming}
          >
            {availableModels.map((model) => (
              <option 
                key={model.id} 
                value={model.id}
                disabled={model.disabled}
              >
                {model.name}
              </option>
            ))}
          </select>
          <button
            className="add-model-btn"
            onClick={() => setIsModelManagerOpen(true)}
            disabled={isStreaming}
            title="管理自定义模型"
          >
            ➕
          </button>
        </div>

        {/* 操作按钮 */}
        <div className="chat-actions">
          <button
            className="clear-btn"
            onClick={handleClearChat}
            disabled={isStreaming || messages.length === 0}
            title="清空聊天"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="empty-icon">💬</div>
            <div className="empty-text">
              <p>欢迎使用 AI 助手！</p>
              <p>你可以：</p>
              <ul>
                <li>询问关于文件的问题</li>
                <li>请求代码分析和解释</li>
                <li>获取技术建议</li>
                <li>进行一般性对话</li>
              </ul>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onRetry={handleRetry}
              />
            ))}
            {isStreaming && (
              <div className="typing-indicator">
                <div className="typing-avatar">🤖</div>
                <div className="typing-content">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 上下文信息 */}
      {context && (
        <div className="chat-context">
          <div className="context-info">
            📎 当前上下文: 
            {context.selectedFile && (
              <span className="context-file">
                {context.selectedFile.name}
              </span>
            )}
            {context.workspacePath && (
              <span className="context-workspace">
                {context.workspacePath}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <div className="input-container">
          <textarea
            ref={inputRef}
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? "AI 正在思考中..." : "输入消息..."}
            disabled={isStreaming}
            rows="1"
            className="chat-input"
          />
          <button
            type="submit"
            disabled={!currentInput.trim() || isStreaming}
            className="send-btn"
            title="发送消息"
          >
            {isStreaming ? '⏳' : '发送'}
          </button>
        </div>
      </form>

      {/* 自定义模型管理器 */}
      <ChatModelManager 
        isOpen={isModelManagerOpen}
        onClose={() => setIsModelManagerOpen(false)}
      />
    </div>
  )
}
