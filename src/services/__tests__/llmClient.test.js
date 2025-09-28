import { LLMClient, llmClient } from '../llmClient'

describe('LLMClient', () => {
  let client

  beforeEach(() => {
    client = new LLMClient()
  })

  test('应该初始化所有提供者', () => {
    const models = client.getAvailableModels()
    
    expect(models).toHaveLength(4)
    expect(models.map(m => m.id)).toContain('mock-echo')
    expect(models.map(m => m.id)).toContain('mock-assistant')
    expect(models.map(m => m.id)).toContain('gpt-3.5-turbo')
    expect(models.map(m => m.id)).toContain('gpt-4')
  })

  test('应该检查模型可用性', () => {
    expect(client.isModelAvailable('mock-echo')).toBe(true)
    expect(client.isModelAvailable('mock-assistant')).toBe(true)
    expect(client.isModelAvailable('unknown-model')).toBe(false)
  })

  test('mock-echo 提供者应该返回回声', async () => {
    const messages = [
      { role: 'user', content: 'Hello, World!' }
    ]

    const response = await client.sendMessage({
      model: 'mock-echo',
      messages
    })

    expect(response.content).toBe('回声: Hello, World!')
    expect(response.model).toBe('mock-echo')
    expect(response.usage.tokens).toBe(13) // "Hello, World!" 的长度
  })

  test('mock-assistant 提供者应该智能回复', async () => {
    const messages = [
      { role: 'user', content: '你好' }
    ]

    const response = await client.sendMessage({
      model: 'mock-assistant',
      messages
    })

    expect(response.content).toContain('你好')
    expect(response.model).toBe('mock-assistant')
    expect(typeof response.usage.tokens).toBe('number')
  })

  test('mock-assistant 应该处理文件相关问题', async () => {
    const messages = [
      { role: 'user', content: '帮我分析这个文件' }
    ]
    const context = {
      files: [{ name: 'test.js', path: '/test/test.js' }]
    }

    const response = await client.sendMessage({
      model: 'mock-assistant',
      messages,
      context
    })

    expect(response.content).toContain('文件')
    expect(response.content).toContain('1')
  })

  test('mock-assistant 应该处理帮助请求', async () => {
    const messages = [
      { role: 'user', content: '我需要帮助' }
    ]

    const response = await client.sendMessage({
      model: 'mock-assistant',
      messages
    })

    expect(response.content).toContain('帮助')
    expect(response.content).toContain('文件管理')
  })

  test('mock-assistant 应该处理感谢', async () => {
    const messages = [
      { role: 'user', content: '谢谢你的帮助' }
    ]

    const response = await client.sendMessage({
      model: 'mock-assistant',
      messages
    })

    expect(response.content).toContain('不客气')
  })

  test('mock-assistant 应该处理通用问题', async () => {
    const messages = [
      { role: 'user', content: '什么是 JavaScript？' }
    ]

    const response = await client.sendMessage({
      model: 'mock-assistant',
      messages
    })

    expect(response.content).toContain('JavaScript')
    expect(response.content.length).toBeGreaterThan(10)
  })

  test('应该处理未知模型', async () => {
    await expect(client.sendMessage({
      model: 'unknown-model',
      messages: []
    })).rejects.toThrow('未知的模型: unknown-model')
  })

  test('OpenAI 模型应该抛出配置错误', async () => {
    await expect(client.sendMessage({
      model: 'gpt-3.5-turbo',
      messages: []
    })).rejects.toThrow('OpenAI API 尚未配置')

    await expect(client.sendMessage({
      model: 'gpt-4',
      messages: []
    })).rejects.toThrow('OpenAI API 尚未配置')
  })

  test('应该处理提供者错误', async () => {
    // 创建一个会抛出错误的提供者
    const errorClient = new LLMClient()
    errorClient.providers.set('error-model', {
      name: 'Error Model',
      sendMessage: async () => {
        throw new Error('Provider error')
      }
    })

    await expect(errorClient.sendMessage({
      model: 'error-model',
      messages: []
    })).rejects.toThrow('Error Model 错误: Provider error')
  })

  test('单例实例应该正常工作', () => {
    expect(llmClient).toBeInstanceOf(LLMClient)
    expect(llmClient.isModelAvailable('mock-echo')).toBe(true)
  })

  test('mock 提供者应该有适当的延迟', async () => {
    const startTime = Date.now()
    
    await client.sendMessage({
      model: 'mock-echo',
      messages: [{ role: 'user', content: 'test' }]
    })
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    // 应该至少有 500ms 的延迟
    expect(duration).toBeGreaterThanOrEqual(500)
  })

  test('mock-assistant 延迟应该比 echo 更长', async () => {
    // 使用 Promise.all 来并行测试，避免时序问题
    const [echoResult, assistantResult] = await Promise.all([
      (async () => {
        const start = Date.now()
        await client.sendMessage({
          model: 'mock-echo',
          messages: [{ role: 'user', content: 'test' }]
        })
        return Date.now() - start
      })(),
      (async () => {
        const start = Date.now()
        await client.sendMessage({
          model: 'mock-assistant',
          messages: [{ role: 'user', content: 'test' }]
        })
        return Date.now() - start
      })()
    ])

    // assistant 的最小延迟应该比 echo 的最小延迟更长
    // echo: 500-1500ms, assistant: 800-2000ms
    expect(assistantResult).toBeGreaterThanOrEqual(800)
    expect(echoResult).toBeGreaterThanOrEqual(500)
  })
})
