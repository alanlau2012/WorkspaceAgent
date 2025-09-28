/**
 * MaaS Mock Provider 工厂函数
 * 创建模拟的 MaaS (Model as a Service) 提供者
 */

export function createMaasMockProvider(config = {}) {
  const name = config?.name || 'Custom MaaS Mock'
  const baseUrl = config?.baseUrl || 'mock://maas'
  const model = config?.model || 'mock-model'
  const id = config?.id || 'custom-maas'

  return {
    name,
    async sendMessage({ messages, context, config: requestConfig }) {
      // 模拟网络延迟
      const delay = 400 + Math.random() * 600
      await new Promise(resolve => setTimeout(resolve, delay))

      const lastMessage = messages[messages.length - 1]
      const userContent = lastMessage?.content || ''

      // 构造回复内容，包含模型信息和用户输入的回显
      const responseContent = `[${name}](${baseUrl}/${model}) -> ${userContent}`

      return {
        content: responseContent,
        model: id,
        usage: {
          tokens: userContent.length
        }
      }
    }
  }
}

// 导出默认配置的便捷函数
export function createDefaultMaasMockProvider() {
  return createMaasMockProvider({
    id: 'default-maas',
    name: 'Default MaaS Mock',
    baseUrl: 'mock://default-maas',
    model: 'default-model'
  })
}