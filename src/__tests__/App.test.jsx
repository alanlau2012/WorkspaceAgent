import React from 'react'
import { render, screen } from '@testing-library/react'
import App from '../App'
import { useChatStore } from '../stores/chatStore'

jest.mock('../stores/chatStore', () => ({
  useChatStore: jest.fn()
}))

describe('App', () => {
  beforeEach(() => {
    // 重置 Store 模拟
    useChatStore.mockReturnValue({
      messages: [],
      selectedModel: 'mock-echo',
      availableModels: [],
      isStreaming: false,
      currentInput: '',
      setSelectedModel: jest.fn(),
      setCurrentInput: jest.fn(),
      sendMessage: jest.fn(),
      clearMessages: jest.fn(),
      getMessageStats: jest.fn(() => ({ total: 0 }))
    })
  })

  test('应该渲染AI聊天面板', () => {
    render(<App />)

    expect(screen.getByText('AI 助手')).toBeInTheDocument()
  })
})
