/**
 * @jest-environment node
 */
import { LLMClient } from '../llmClient'
import { createMaasMockProvider } from '../maasMockProvider'

describe('LLMClient Custom Models', () => {
  let client

  beforeEach(() => {
    client = new LLMClient()
  })

  describe('Model Registration', () => {
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

    test('should register custom model successfully', () => {
      const provider = { name: 'Test Model', sendMessage: jest.fn() }
      
      client.registerModel('test-model', provider)
      
      expect(client.hasModel('test-model')).toBe(true)
      expect(client.isModelAvailable('test-model')).toBe(true)
    })

    test('should unregister model successfully', () => {
      const provider = { name: 'Test Model', sendMessage: jest.fn() }
      client.registerModel('test-model', provider)
      
      client.unregisterModel('test-model')
      
      expect(client.hasModel('test-model')).toBe(false)
      expect(client.isModelAvailable('test-model')).toBe(false)
    })

    test('should update existing model (upsert behavior)', () => {
      const provider1 = { name: 'Test Model v1', sendMessage: jest.fn() }
      const provider2 = { name: 'Test Model v2', sendMessage: jest.fn() }
      
      client.registerModel('test-model', provider1)
      client.updateModel('test-model', provider2)
      
      const models = client.getAvailableModels()
      const testModel = models.find(m => m.id === 'test-model')
      expect(testModel.name).toBe('Test Model v2')
    })

    test('should include custom models in available models list', () => {
      const provider = { name: 'Custom Model', sendMessage: jest.fn() }
      client.registerModel('custom-model', provider)
      
      const models = client.getAvailableModels()
      const customModel = models.find(m => m.id === 'custom-model')
      
      expect(customModel).toBeDefined()
      expect(customModel.name).toBe('Custom Model')
    })

    test('register invalid provider should throw', () => {
      expect(() => client.registerModel('bad', null)).toThrow()
      expect(() => client.registerModel('', { name: 'X', sendMessage: async () => ({}) })).toThrow()
      expect(() => client.registerModel('bad2', { name: 'X' })).toThrow()
    })
  })

  describe('MaaS Mock Provider Integration', () => {
    test('should create mock provider with correct configuration', () => {
      const config = {
        id: 'maas-dev',
        name: 'MaaS Mock',
        baseUrl: 'mock://maas',
        model: 'demo',
        apiKey: 'test-key'
      }
      
      const provider = createMaasMockProvider(config)
      
      expect(provider.name).toBe('MaaS Mock')
      expect(typeof provider.sendMessage).toBe('function')
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

    test('should send message through registered mock provider', async () => {
      const config = {
        id: 'maas-dev',
        name: 'MaaS Mock',
        baseUrl: 'mock://maas',
        model: 'demo'
      }
      
      const provider = createMaasMockProvider(config)
      client.registerModel('maas-dev', provider)
      
      const messages = [{ role: 'user', content: '你好' }]
      const response = await client.sendMessage({
        model: 'maas-dev',
        messages,
        context: null,
        config
      })
      
      expect(response.content).toContain('[MaaS Mock]')
      expect(response.content).toContain('mock://maas/demo')
      expect(response.content).toContain('你好')
      expect(response.model).toBe('maas-dev')
      expect(response.usage).toBeDefined()
      expect(response.usage.tokens).toBe(2) // '你好'.length
    })

    test('should handle sendMessage with config parameter', async () => {
      const provider = { 
        name: 'Test Provider', 
        sendMessage: jest.fn().mockResolvedValue({
          content: 'test response',
          model: 'test-model',
          usage: { tokens: 10 }
        })
      }
      client.registerModel('test-model', provider)
      
      const config = { temperature: 0.7 }
      const messages = [{ role: 'user', content: 'test' }]
      
      await client.sendMessage({
        model: 'test-model',
        messages,
        context: null,
        config
      })
      
      expect(provider.sendMessage).toHaveBeenCalledWith({
        messages,
        context: null,
        config
      })
    })

    test('should throw error for unknown model', async () => {
      await expect(client.sendMessage({
        model: 'unknown-model',
        messages: [{ role: 'user', content: 'test' }]
      })).rejects.toThrow('未知的模型: unknown-model')
    })

    test('unknown model should still throw', async () => {
      await expect(client.sendMessage({ model: 'not-exists', messages: [] })).rejects.toThrow('未知的模型: not-exists')
    })
  })

  describe('Error Handling', () => {
    test('should handle provider sendMessage errors', async () => {
      const provider = {
        name: 'Error Provider',
        sendMessage: jest.fn().mockRejectedValue(new Error('Provider error'))
      }
      client.registerModel('error-model', provider)
      
      await expect(client.sendMessage({
        model: 'error-model',
        messages: [{ role: 'user', content: 'test' }]
      })).rejects.toThrow('Error Provider 错误: Provider error')
    })

    test('should return false for non-existent model check', () => {
      expect(client.hasModel('non-existent')).toBe(false)
    })

    test('should handle unregistering non-existent model gracefully', () => {
      expect(() => client.unregisterModel('non-existent')).not.toThrow()
    })
  })
})
