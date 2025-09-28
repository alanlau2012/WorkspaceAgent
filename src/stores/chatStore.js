import { create } from 'zustand'

export const useChatStore = create((set, get) => ({
  // 状态
  messages: [],
  selectedModel: 'mock-echo', // 默认使用 mock 模型
  isStreaming: false,
  currentInput: '',
  
  // 可用的模型列表
  availableModels: [
    { id: 'mock-echo', name: 'Mock Echo', description: '回声测试模型' },
    { id: 'mock-assistant', name: 'Mock Assistant', description: '模拟助手模型' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'OpenAI GPT-3.5', disabled: true },
    { id: 'gpt-4', name: 'GPT-4', description: 'OpenAI GPT-4', disabled: true },
  ],

  // Actions
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      ...message
    }]
  })),

  updateMessage: (messageId, updates) => set((state) => ({
    messages: state.messages.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    )
  })),

  setSelectedModel: (modelId) => set({ selectedModel: modelId }),

  setIsStreaming: (streaming) => set({ isStreaming: streaming }),

  setCurrentInput: (input) => set({ currentInput: input }),

  clearMessages: () => set({ messages: [] }),

  // 发送消息的完整流程
  sendMessage: async (content, context = null) => {
    const { addMessage, selectedModel, setIsStreaming } = get()
    
    // 添加用户消息
    const userMessage = {
      type: 'user',
      content,
      context
    }
    addMessage(userMessage)

    // 设置流式状态
    setIsStreaming(true)

    try {
      // 动态导入 llmClient 避免循环依赖
      const { llmClient } = await import('../services/llmClient')
      
      // 准备消息历史
      const messages = get().messages
      
      // 发送到 LLM
      const response = await llmClient.sendMessage({
        model: selectedModel,
        messages: messages.map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        context
      })

      // 添加 AI 回复
      addMessage({
        type: 'assistant',
        content: response.content,
        model: selectedModel
      })

    } catch (error) {
      // 添加错误消息
      addMessage({
        type: 'assistant',
        content: `抱歉，发生了错误: ${error.message}`,
        model: selectedModel,
        isError: true
      })
    } finally {
      setIsStreaming(false)
    }
  },

  // 获取消息统计
  getMessageStats: () => {
    const { messages } = get()
    return {
      total: messages.length,
      user: messages.filter(msg => msg.type === 'user').length,
      assistant: messages.filter(msg => msg.type === 'assistant').length
    }
  }
}))
