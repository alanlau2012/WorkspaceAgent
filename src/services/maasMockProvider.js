export function createMaasMockProvider(config = {}) {
  const name = config?.name || 'Custom MaaS Mock'
  const baseUrl = config?.baseUrl || 'mock://maas'
  const defaultModel = config?.model || 'mock-model'
  const id = config?.id || 'custom-maas'

  return {
    name,
    async sendMessage({ messages }) {
      // simulate network latency 400-1000ms
      await new Promise(r => setTimeout(r, 400 + Math.random() * 600))
      const last = messages?.[messages.length - 1] || { content: '' }
      const content = `[${name}](${baseUrl}/${defaultModel}) -> ${last.content ?? ''}`
      return {
        content,
        model: id,
        usage: { tokens: String(last.content || '').length }
      }
    }
  }
}
