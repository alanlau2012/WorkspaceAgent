import { LLMClient } from '../llmClient'
import { createMaasMockProvider } from '../maasMockProvider'

describe('LLMClient custom model registration (TDD)', () => {
  let client

  beforeEach(() => {
    client = new LLMClient()
  })

  test('registerModel / unregisterModel / hasModel (upsert strategy)', async () => {
    const providerA = { name: 'Provider A', sendMessage: async () => ({ content: 'A', model: 'x', usage: { tokens: 1 } }) }
    const providerB = { name: 'Provider B', sendMessage: async () => ({ content: 'B', model: 'x', usage: { tokens: 1 } }) }

    // initially not present
    expect(client.isModelAvailable('my-model')).toBe(false)
    expect(typeof client.hasModel === 'function' ? client.hasModel('my-model') : client.isModelAvailable('my-model')).toBe(false)

    // register
    expect(() => client.registerModel('my-model', providerA)).not.toThrow()
    expect(client.isModelAvailable('my-model')).toBe(true)

    // available models should include name from provider
    const modelsAfterA = client.getAvailableModels()
    const itemA = modelsAfterA.find(m => m.id === 'my-model')
    expect(itemA).toBeTruthy()
    expect(itemA.name).toBe('Provider A')

    // upsert (update) with same id
    client.registerModel('my-model', providerB)
    const modelsAfterB = client.getAvailableModels()
    const itemB = modelsAfterB.find(m => m.id === 'my-model')
    expect(itemB.name).toBe('Provider B')

    // explicit update API should behave the same
    const providerC = { name: 'Provider C', sendMessage: async () => ({ content: 'C', model: 'x', usage: { tokens: 1 } }) }
    expect(() => client.updateModel('my-model', providerC)).not.toThrow()
    const modelsAfterC = client.getAvailableModels()
    const itemC = modelsAfterC.find(m => m.id === 'my-model')
    expect(itemC.name).toBe('Provider C')

    // unregister
    client.unregisterModel('my-model')
    expect(client.isModelAvailable('my-model')).toBe(false)
  })

  test('register invalid provider should throw', () => {
    expect(() => client.registerModel('bad', null)).toThrow()
    expect(() => client.registerModel('', { name: 'X', sendMessage: async () => ({}) })).toThrow()
    expect(() => client.registerModel('bad2', { name: 'X' })).toThrow()
  })

  test('maasMockProvider can be registered and used', async () => {
    const cfg = { id: 'maas-dev', name: 'MaaS Mock', baseUrl: 'mock://maas', model: 'demo' }
    const provider = createMaasMockProvider(cfg)

    client.registerModel(cfg.id, provider)

    const res = await client.sendMessage({
      model: cfg.id,
      messages: [{ role: 'user', content: 'ping' }],
      context: { foo: 'bar' },
      config: { test: true }
    })

    expect(res.content).toBe('[MaaS Mock](mock://maas/demo) -> ping')
    expect(res.model).toBe('maas-dev')
    expect(res.usage && typeof res.usage.tokens).toBe('number')
  })

  test('unknown model should still throw', async () => {
    await expect(client.sendMessage({ model: 'not-exists', messages: [] })).rejects.toThrow('未知的模型: not-exists')
  })
})
