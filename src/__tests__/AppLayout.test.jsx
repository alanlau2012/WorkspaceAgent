import React from 'react'
import { render, screen } from '@testing-library/react'
import App from '../App'
import { useChatStore } from '../stores/chatStore'

jest.mock('../stores/chatStore', () => ({
  useChatStore: jest.fn()
}))

const createMockStore = () => ({
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

describe('App layout dark theme integration', () => {
  beforeEach(() => {
    useChatStore.mockReturnValue(createMockStore())
  })

  test('渲染新的标题栏与三栏布局结构', () => {
    render(<App />)

    expect(screen.getByText('WorkspaceAgent - AI 文件管理助手')).toBeInTheDocument()
    expect(screen.getByText('工作区文件')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '📁 打开' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '🔄 刷新' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '➕ 新建' })).toBeInTheDocument()
    expect(screen.getByText('AI 助手')).toBeInTheDocument()
  })
})
