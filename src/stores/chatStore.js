import { create } from 'zustand'

export const useChatStore = create((set, get) => ({
  // 状态
  messages: [],
  selectedModel: 'mock-echo', // 默认使用 mock 模型
  isStreaming: false,
  currentInput: '',
  
  // 自定义模型列表
  customModels: [],
  
  // 可用的模型列表（现在由 syncAvailableModels 动态更新）
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
  },

  // 自定义模型管理
  
  /**
   * 从本地存储初始化自定义模型
   */
  initModelsFromStorage: async () => {
    try {
      const stored = localStorage.getItem('customModels')
      if (stored) {
        const customModels = JSON.parse(stored)
        set({ customModels })
        
        // 为每个自定义模型注册到 llmClient
        const { llmClient } = await import('../services/llmClient')
        const { createMaasMockProvider } = await import('../services/maasMockProvider')
        
        for (const modelConfig of customModels) {
          if (!modelConfig.disabled) {
            const provider = createMaasMockProvider(modelConfig)
            llmClient.registerModel(modelConfig.id, provider)
          }
        }
        
        // 同步可用模型列表
        get().syncAvailableModels()
      }
    } catch (error) {
      console.error('初始化自定义模型失败:', error)
      set({ customModels: [] })
    }
  },

  /**
   * 添加自定义模型
   * @param {Object} modelConfig - 模型配置
   */
  addCustomModel: async (modelConfig) => {
    const { customModels } = get()
    
    // 检查是否存在相同ID的模型，如果存在则更新
    const existingIndex = customModels.findIndex(m => m.id === modelConfig.id)
    let newCustomModels
    
    if (existingIndex >= 0) {
      // 更新现有模型
      newCustomModels = [...customModels]
      newCustomModels[existingIndex] = { ...newCustomModels[existingIndex], ...modelConfig }
    } else {
      // 添加新模型
      newCustomModels = [...customModels, modelConfig]
    }
    
    // 更新状态
    set({ customModels: newCustomModels })
    
    // 保存到本地存储
    localStorage.setItem('customModels', JSON.stringify(newCustomModels))
    
    // 注册到 llmClient
    if (!modelConfig.disabled) {
      try {
        const { llmClient } = await import('../services/llmClient')
        const { createMaasMockProvider } = await import('../services/maasMockProvider')
        
        const provider = createMaasMockProvider(modelConfig)
        llmClient.registerModel(modelConfig.id, provider)
      } catch (error) {
        console.error('注册自定义模型失败:', error)
      }
    }
    
    // 同步可用模型列表
    get().syncAvailableModels()
  },

  /**
   * 移除自定义模型
   * @param {string} modelId - 模型ID
   */
  removeCustomModel: async (modelId) => {
    const { customModels, selectedModel } = get()
    
    // 从列表中移除
    const newCustomModels = customModels.filter(m => m.id !== modelId)
    set({ customModels: newCustomModels })
    
    // 保存到本地存储
    localStorage.setItem('customModels', JSON.stringify(newCustomModels))
    
    // 从 llmClient 注销
    try {
      const { llmClient } = await import('../services/llmClient')
      llmClient.unregisterModel(modelId)
    } catch (error) {
      console.error('注销自定义模型失败:', error)
    }
    
    // 如果删除的是当前选中的模型，切换到默认模型
    if (selectedModel === modelId) {
      set({ selectedModel: 'mock-echo' })
    }
    
    // 同步可用模型列表
    get().syncAvailableModels()
  },

  /**
   * 更新自定义模型
   * @param {string} modelId - 模型ID
   * @param {Object} updates - 更新的配置
   */
  updateCustomModel: async (modelId, updates) => {
    const { customModels } = get()
    const modelIndex = customModels.findIndex(m => m.id === modelId)
    
    if (modelIndex >= 0) {
      const newCustomModels = [...customModels]
      newCustomModels[modelIndex] = { ...newCustomModels[modelIndex], ...updates }
      
      set({ customModels: newCustomModels })
      
      // 保存到本地存储
      localStorage.setItem('customModels', JSON.stringify(newCustomModels))
      
      // 重新注册到 llmClient
      if (!newCustomModels[modelIndex].disabled) {
        try {
          const { llmClient } = await import('../services/llmClient')
          const { createMaasMockProvider } = await import('../services/maasMockProvider')
          
          const provider = createMaasMockProvider(newCustomModels[modelIndex])
          llmClient.updateModel(modelId, provider)
        } catch (error) {
          console.error('更新自定义模型失败:', error)
        }
      }
      
      // 同步可用模型列表
      get().syncAvailableModels()
    }
  },

  /**
   * 从 llmClient 同步可用模型列表
   */
  syncAvailableModels: async () => {
    try {
      const { llmClient } = await import('../services/llmClient')
      const models = llmClient.getAvailableModels()
      
      // 转换为组件需要的格式，添加描述等信息
      const availableModels = models.map(model => ({
        id: model.id,
        name: model.name,
        description: get().customModels.find(cm => cm.id === model.id)?.description || 
                    (model.id.startsWith('mock-') ? '测试模型' : '自定义模型')
      }))
      
      set({ availableModels })
    } catch (error) {
      console.error('同步可用模型失败:', error)
    }
  }
}))
