import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatMessage } from '../ChatMessage'

describe('ChatMessage', () => {
  const mockMessage = {
    id: 1,
    type: 'user',
    content: 'Hello, World!',
    timestamp: '2023-12-01T10:00:00.000Z'
  }

  test('应该渲染用户消息', () => {
    render(<ChatMessage message={mockMessage} />)
    
    expect(screen.getByText('Hello, World!')).toBeInTheDocument()
    expect(screen.getByText('你')).toBeInTheDocument()
    expect(screen.getByText('👤')).toBeInTheDocument()
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument()
  })

  test('应该渲染AI消息', () => {
    const aiMessage = {
      ...mockMessage,
      type: 'assistant',
      model: 'mock-echo'
    }
    
    render(<ChatMessage message={aiMessage} />)
    
    expect(screen.getByText('Hello, World!')).toBeInTheDocument()
    expect(screen.getByText('mock-echo')).toBeInTheDocument()
    expect(screen.getByText('🤖')).toBeInTheDocument()
  })

  test('应该处理多行内容', () => {
    const multilineMessage = {
      ...mockMessage,
      content: 'Line 1\nLine 2\nLine 3'
    }
    
    render(<ChatMessage message={multilineMessage} />)
    
    // 检查内容是否包含所有行（由于 br 标签分隔，需要使用 textContent）
    const messageContent = document.querySelector('.message-content')
    expect(messageContent.textContent).toContain('Line 1')
    expect(messageContent.textContent).toContain('Line 2')
    expect(messageContent.textContent).toContain('Line 3')
  })

  test('应该显示上下文信息', () => {
    const messageWithContext = {
      ...mockMessage,
      context: {
        files: [
          { name: 'test.js' },
          { name: 'app.js' }
        ]
      }
    }
    
    render(<ChatMessage message={messageWithContext} />)
    
    expect(screen.getByText('📎 上下文:')).toBeInTheDocument()
    expect(screen.getByText('test.js')).toBeInTheDocument()
    expect(screen.getByText('app.js')).toBeInTheDocument()
  })

  test('应该显示错误消息和重试按钮', () => {
    const errorMessage = {
      ...mockMessage,
      isError: true
    }
    const mockRetry = jest.fn()
    
    render(<ChatMessage message={errorMessage} onRetry={mockRetry} />)
    
    const retryButton = screen.getByText('🔄 重试')
    expect(retryButton).toBeInTheDocument()
    
    fireEvent.click(retryButton)
    expect(mockRetry).toHaveBeenCalledWith(errorMessage)
  })

  test('应该处理没有时间戳的消息', () => {
    const messageWithoutTimestamp = {
      ...mockMessage,
      timestamp: null
    }
    
    render(<ChatMessage message={messageWithoutTimestamp} />)
    
    expect(screen.getByText('Hello, World!')).toBeInTheDocument()
    // 时间戳区域应该为空
    expect(screen.queryByText(/\d{2}:\d{2}/)).not.toBeInTheDocument()
  })

  test('应该正确格式化时间', () => {
    const messageWithTime = {
      ...mockMessage,
      timestamp: '2023-12-01T15:30:45.000Z'
    }
    
    render(<ChatMessage message={messageWithTime} />)
    
    // 应该显示本地时间格式
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument()
  })

  test('应该应用正确的CSS类', () => {
    const { container } = render(<ChatMessage message={mockMessage} />)
    
    const messageElement = container.querySelector('.chat-message')
    expect(messageElement).toHaveClass('user')
    expect(messageElement).not.toHaveClass('error')
  })

  test('应该为错误消息应用错误类', () => {
    const errorMessage = {
      ...mockMessage,
      isError: true
    }
    
    const { container } = render(<ChatMessage message={errorMessage} />)
    
    const messageElement = container.querySelector('.chat-message')
    expect(messageElement).toHaveClass('error')
  })

  test('应该为AI消息显示默认模型名', () => {
    const aiMessageWithoutModel = {
      ...mockMessage,
      type: 'assistant',
      model: undefined
    }
    
    render(<ChatMessage message={aiMessageWithoutModel} />)
    
    expect(screen.getByText('AI助手')).toBeInTheDocument()
  })

  test('不应该在没有onRetry回调时显示重试按钮', () => {
    const errorMessage = {
      ...mockMessage,
      isError: true
    }
    
    render(<ChatMessage message={errorMessage} />)
    
    expect(screen.queryByText('🔄 重试')).not.toBeInTheDocument()
  })

  test('应该处理空的上下文文件数组', () => {
    const messageWithEmptyContext = {
      ...mockMessage,
      context: {
        files: []
      }
    }
    
    render(<ChatMessage message={messageWithEmptyContext} />)
    
    expect(screen.getByText('📎 上下文:')).toBeInTheDocument()
    // 不应该有文件标签
    expect(screen.queryByText('test.js')).not.toBeInTheDocument()
  })
})
