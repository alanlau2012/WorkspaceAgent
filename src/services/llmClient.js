// LLM 客户端抽象层
class LLMClient {
  constructor() {
    this.providers = new Map()
    this.initializeProviders()
  }

  initializeProviders() {
    // Mock Echo Provider - 简单回声
    this.providers.set('mock-echo', {
      name: 'Mock Echo',
      sendMessage: async ({ messages }) => {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))
        
        const lastMessage = messages[messages.length - 1]
        return {
          content: `回声: ${lastMessage.content}`,
          model: 'mock-echo',
          usage: { tokens: lastMessage.content.length }
        }
      }
    })

    // Mock Assistant Provider - 智能回复
    this.providers.set('mock-assistant', {
      name: 'Mock Assistant',
      sendMessage: async ({ messages, context }) => {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200))
        
        const lastMessage = messages[messages.length - 1]
        const userInput = lastMessage.content.toLowerCase()
        
        let response = ''
        
        // 简单的规则回复
        if (userInput.includes('你好') || userInput.includes('hello')) {
          response = '你好！我是 WorkspaceAgent 的 AI 助手。我可以帮助你管理文件、回答问题。有什么我可以帮助你的吗？'
        } else if (userInput.includes('文件') || userInput.includes('file')) {
          if (context && context.files) {
            response = `我看到你当前选择了 ${context.files.length} 个文件。我可以帮你分析这些文件的内容，或者协助进行文件操作。`
          } else {
            response = '我可以帮助你进行文件管理操作，比如创建、删除、重命名文件等。你可以先在左侧选择一些文件，然后我就能基于这些文件为你提供更具体的帮助。'
          }
        } else if (userInput.includes('谢谢') || userInput.includes('thank')) {
          response = '不客气！如果还有其他问题，随时可以问我。'
        } else if (userInput.includes('帮助') || userInput.includes('help')) {
          response = `我可以为你提供以下帮助：
• 文件管理：创建、删除、重命名文件
• 代码分析：解释代码逻辑、发现问题
• 内容总结：总结文档内容
• 问题解答：回答技术问题

请告诉我你需要什么帮助！`
        } else {
          // 通用回复
          const responses = [
            '这是一个很有趣的问题。让我想想...',
            '我理解你的意思。基于当前的上下文，我建议...',
            '这个问题涉及多个方面。让我为你详细分析一下。',
            '好问题！这让我想到了几个相关的要点。'
          ]
          const randomResponse = responses[Math.floor(Math.random() * responses.length)]
          response = `${randomResponse}\n\n对于"${lastMessage.content}"这个问题，我需要更多信息才能给出准确的回答。你能提供更多细节吗？`
        }
        
        return {
          content: response,
          model: 'mock-assistant',
          usage: { tokens: response.length }
        }
      }
    })

    // OpenAI Provider (占位符，暂未实现)
    this.providers.set('gpt-3.5-turbo', {
      name: 'GPT-3.5 Turbo',
      sendMessage: async () => {
        throw new Error('OpenAI API 尚未配置。请在设置中添加 API 密钥。')
      }
    })

    this.providers.set('gpt-4', {
      name: 'GPT-4',
      sendMessage: async () => {
        throw new Error('OpenAI API 尚未配置。请在设置中添加 API 密钥。')
      }
    })
  }

  async sendMessage({ model, messages, context, config }) {
    const provider = this.providers.get(model)
    
    if (!provider) {
      throw new Error(`未知的模型: ${model}`)
    }

    try {
      return await provider.sendMessage({ messages, context, config })
    } catch (error) {
      throw new Error(`${provider.name} 错误: ${error.message}`)
    }
  }

  getAvailableModels() {
    return Array.from(this.providers.keys()).map(id => ({
      id,
      name: this.providers.get(id).name
    }))
  }

  isModelAvailable(modelId) {
    return this.providers.has(modelId)
  }

  /**
   * 注册自定义模型
   * @param {string} id - 模型ID
   * @param {Object} provider - 提供者对象，必须包含 name 和 sendMessage 方法
   */
  registerModel(id, provider) {
    if (!id || typeof id !== 'string') {
      throw new Error('模型ID必须是非空字符串')
    }
    
    if (!provider || typeof provider.sendMessage !== 'function') {
      throw new Error('提供者必须包含 sendMessage 方法')
    }
    
    this.providers.set(id, provider)
  }

  /**
   * 注销模型
   * @param {string} id - 模型ID
   */
  unregisterModel(id) {
    this.providers.delete(id)
  }

  /**
   * 检查模型是否存在
   * @param {string} id - 模型ID
   * @returns {boolean}
   */
  hasModel(id) {
    return this.providers.has(id)
  }

  /**
   * 更新现有模型（如果不存在则创建）
   * @param {string} id - 模型ID
   * @param {Object} provider - 提供者对象
   */
  updateModel(id, provider) {
    this.registerModel(id, provider)
  }
}

// 导出单例实例
export const llmClient = new LLMClient()

// 导出类以便测试
export { LLMClient }
