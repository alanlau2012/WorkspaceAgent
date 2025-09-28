/**
 * @jest-environment node
 */
import { useChatStore } from '../chatStore'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock llmClient
jest.mock('../../services/llmClient', () => ({
  llmClient: {
    registerModel: jest.fn(),
    unregisterModel: jest.fn(),
    updateModel: jest.fn(),
    getAvailableModels: jest.fn(() => [
      { id: 'mock-echo', name: 'Mock Echo' },
      { id: 'mock-assistant', name: 'Mock Assistant' }
    ]),
    sendMessage: jest.fn().mockResolvedValue({
      content: 'Test response',
      model: 'test-model',
      usage: { tokens: 10 }
    })
  }
}))

// Mock maasMockProvider
jest.mock('../../services/maasMockProvider', () => ({
  createMaasMockProvider: jest.fn((config) => ({
    name: config?.name || 'Mock Provider',
    sendMessage: jest.fn()
  }))
}))

describe('ChatStore Custom Models', () => {
  let store

  beforeEach(() => {
    // 重置所有mocks
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    
    // 重置store状态
    useChatStore.setState({
      messages: [],
      selectedModel: 'mock-echo',
      customModels: [],
      availableModels: [
        { id: 'mock-echo', name: 'Mock Echo', description: '回声测试模型' },
        { id: 'mock-assistant', name: 'Mock Assistant', description: '模拟助手模型' }
      ]
    })
    
    // 获取最新的store实例
    store = useChatStore.getState()
  })

  describe('Custom Models Management', () => {
    test('should initialize custom models from localStorage', async () => {
      const customModels = [
        {
          id: 'maas-dev',
          name: 'MaaS Mock',
          type: 'mock',
          baseUrl: 'mock://maas',
          model: 'demo',
          disabled: false
        }
      ]
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(customModels))
      
      await store.initModelsFromStorage()
      
      // 重新获取store状态
      const currentState = useChatStore.getState()
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('customModels')
      expect(currentState.customModels).toEqual(customModels)
    })

    test('should add custom model and sync available models', async () => {
      const newModel = {
        id: 'custom-test',
        name: 'Custom Test Model',
        type: 'mock',
        baseUrl: 'mock://test',
        model: 'test-model',
        disabled: false
      }
      
      await store.addCustomModel(newModel)
      
      // 重新获取store状态
      const currentState = useChatStore.getState()
      
      expect(currentState.customModels).toContainEqual(newModel)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'customModels',
        JSON.stringify([newModel])
      )
    })

    test('should remove custom model and fallback selectedModel', async () => {
      // 先添加一个自定义模型并选中它
      const customModel = {
        id: 'custom-test',
        name: 'Custom Test Model',
        type: 'mock'
      }
      
      await store.addCustomModel(customModel)
      useChatStore.setState({ selectedModel: 'custom-test' })
      
      // 删除该模型
      await store.removeCustomModel('custom-test')
      
      // 重新获取store状态
      const currentState = useChatStore.getState()
      
      // 验证模型被删除
      expect(currentState.customModels.find(m => m.id === 'custom-test')).toBeUndefined()
      
      // 验证selectedModel回退到默认值
      expect(currentState.selectedModel).toBe('mock-echo')
    })

    test('should update custom model', async () => {
      const originalModel = {
        id: 'custom-test',
        name: 'Original Name',
        type: 'mock'
      }
      
      const updates = {
        name: 'Updated Name',
        baseUrl: 'updated://url'
      }
      
      await store.addCustomModel(originalModel)
      await store.updateCustomModel('custom-test', updates)
      
      // 重新获取store状态
      const currentState = useChatStore.getState()
      const updatedModel = currentState.customModels.find(m => m.id === 'custom-test')
      
      expect(updatedModel.name).toBe('Updated Name')
      expect(updatedModel.baseUrl).toBe('updated://url')
      expect(updatedModel.type).toBe('mock') // 原有属性保持不变
    })

    test('should sync available models from llmClient', async () => {
      const { llmClient } = require('../../services/llmClient')
      
      llmClient.getAvailableModels.mockReturnValue([
        { id: 'mock-echo', name: 'Mock Echo' },
        { id: 'custom-model', name: 'Custom Model' }
      ])
      
      await store.syncAvailableModels()
      
      // 重新获取store状态
      const currentState = useChatStore.getState()
      
      expect(llmClient.getAvailableModels).toHaveBeenCalled()
      expect(currentState.availableModels).toEqual([
        { id: 'mock-echo', name: 'Mock Echo', description: '测试模型' },
        { id: 'custom-model', name: 'Custom Model', description: '自定义模型' }
      ])
    })
  })

  describe('Persistence', () => {
    test('should save custom models to localStorage when adding', async () => {
      const model1 = { id: 'model1', name: 'Model 1', type: 'mock' }
      const model2 = { id: 'model2', name: 'Model 2', type: 'mock' }
      
      await store.addCustomModel(model1)
      await store.addCustomModel(model2)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'customModels',
        JSON.stringify([model1, model2])
      )
    })

    test('should handle invalid JSON in localStorage gracefully', async () => {
      // 首先重置store状态
      useChatStore.setState({ customModels: [] })
      
      localStorageMock.getItem.mockReturnValue('invalid json')
      
      await useChatStore.getState().initModelsFromStorage()
      
      // 重新获取store状态
      const currentState = useChatStore.getState()
      
      // 应该保持默认空数组
      expect(currentState.customModels).toEqual([])
    })
  })

  describe('Integration with llmClient', () => {
    test('should register custom models with llmClient on initialization', async () => {
      const { llmClient } = require('../../services/llmClient')
      
      const customModels = [
        {
          id: 'maas-dev',
          name: 'MaaS Mock',
          type: 'mock',
          baseUrl: 'mock://maas',
          model: 'demo'
        }
      ]
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(customModels))
      
      await store.initModelsFromStorage()
      
      expect(llmClient.registerModel).toHaveBeenCalledWith(
        'maas-dev',
        expect.objectContaining({
          name: 'MaaS Mock'
        })
      )
    })

    test('should unregister model from llmClient when removing', async () => {
      const { llmClient } = require('../../services/llmClient')
      
      const customModel = {
        id: 'custom-test',
        name: 'Custom Test',
        type: 'mock'
      }
      
      await store.addCustomModel(customModel)
      await store.removeCustomModel('custom-test')
      
      expect(llmClient.unregisterModel).toHaveBeenCalledWith('custom-test')
    })
  })
})