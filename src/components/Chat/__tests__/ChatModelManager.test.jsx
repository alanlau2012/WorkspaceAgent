/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChatModelManager } from '../ChatModelManager'
import { useChatStore } from '../../../stores/chatStore'

// Mock store
const mockStore = {
  customModels: [],
  addCustomModel: jest.fn(),
  removeCustomModel: jest.fn(),
  updateCustomModel: jest.fn()
}

jest.mock('../../../stores/chatStore', () => ({
  useChatStore: jest.fn(() => mockStore)
}))

// Mock services
jest.mock('../../../services/llmClient', () => ({
  llmClient: {
    registerModel: jest.fn(),
    unregisterModel: jest.fn(),
    sendMessage: jest.fn().mockResolvedValue({
      content: 'Test response',
      model: 'test-model',
      usage: { tokens: 10 }
    })
  }
}))

jest.mock('../../../services/maasMockProvider', () => ({
  createMaasMockProvider: jest.fn(() => ({
    name: 'Mock Provider',
    sendMessage: jest.fn()
  }))
}))

// Mock window.confirm
global.confirm = jest.fn(() => true)

describe('ChatModelManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockStore.customModels = []
  })

  test('should not render when isOpen is false', () => {
    render(<ChatModelManager isOpen={false} onClose={() => {}} />)
    
    expect(screen.queryByText('自定义模型管理')).not.toBeInTheDocument()
  })

  test('should render when isOpen is true', () => {
    render(<ChatModelManager isOpen={true} onClose={() => {}} />)
    
    expect(screen.getByText('自定义模型管理')).toBeInTheDocument()
    expect(screen.getByText('已添加的模型')).toBeInTheDocument()
    expect(screen.getByText('添加新模型')).toBeInTheDocument()
  })

  test('should close modal when clicking close button', () => {
    const onClose = jest.fn()
    render(<ChatModelManager isOpen={true} onClose={onClose} />)
    
    fireEvent.click(screen.getByTitle('关闭'))
    
    expect(onClose).toHaveBeenCalled()
  })

  test('should close modal when clicking overlay', () => {
    const onClose = jest.fn()
    render(<ChatModelManager isOpen={true} onClose={onClose} />)
    
    const overlay = document.querySelector('.model-manager-overlay')
    fireEvent.click(overlay)
    
    expect(onClose).toHaveBeenCalled()
  })

  test('should show empty state when no custom models', () => {
    render(<ChatModelManager isOpen={true} onClose={() => {}} />)
    
    expect(screen.getByText('暂无自定义模型')).toBeInTheDocument()
  })

  test('should display existing custom models', () => {
    mockStore.customModels = [
      {
        id: 'test-model',
        name: 'Test Model',
        type: 'mock',
        baseUrl: 'mock://test',
        disabled: false
      }
    ]
    
    render(<ChatModelManager isOpen={true} onClose={() => {}} />)
    
    expect(screen.getByText('Test Model')).toBeInTheDocument()
    expect(screen.getByText(/ID: test-model/)).toBeInTheDocument()
  })

  test('should validate form fields', async () => {
    render(<ChatModelManager isOpen={true} onClose={() => {}} />)
    
    // 尝试提交空表单
    fireEvent.click(screen.getByText('添加'))
    
    await waitFor(() => {
      expect(screen.getByText('模型ID不能为空')).toBeInTheDocument()
      expect(screen.getByText('模型名称不能为空')).toBeInTheDocument()
    })
  })

  test('should validate ID format', async () => {
    render(<ChatModelManager isOpen={true} onClose={() => {}} />)
    
    const idInput = screen.getByLabelText('模型ID *')
    fireEvent.change(idInput, { target: { value: 'invalid id!' } })
    fireEvent.click(screen.getByText('添加'))
    
    await waitFor(() => {
      expect(screen.getByText('模型ID只能包含字母、数字、连字符和下划线')).toBeInTheDocument()
    })
  })

  test('should validate JSON headers format', async () => {
    render(<ChatModelManager isOpen={true} onClose={() => {}} />)
    
    const headersInput = screen.getByLabelText('Headers (JSON)')
    fireEvent.change(headersInput, { target: { value: 'invalid json' } })
    fireEvent.click(screen.getByText('添加'))
    
    await waitFor(() => {
      expect(screen.getByText('请输入有效的JSON格式')).toBeInTheDocument()
    })
  })

  test('should add new model successfully', async () => {
    const onClose = jest.fn()
    render(<ChatModelManager isOpen={true} onClose={onClose} />)
    
    // 填写表单
    fireEvent.change(screen.getByLabelText('模型ID *'), {
      target: { value: 'new-model' }
    })
    fireEvent.change(screen.getByLabelText('显示名称 *'), {
      target: { value: 'New Model' }
    })
    fireEvent.change(screen.getByLabelText('Base URL'), {
      target: { value: 'https://api.example.com' }
    })
    
    // 提交表单
    fireEvent.click(screen.getByText('添加'))
    
    await waitFor(() => {
      expect(mockStore.addCustomModel).toHaveBeenCalledWith({
        id: 'new-model',
        name: 'New Model',
        type: 'mock',
        baseUrl: 'https://api.example.com',
        model: '',
        apiKey: '',
        headers: {},
        disabled: false
      })
    })
    
    expect(onClose).toHaveBeenCalled()
  })

  test('should delete model when clicking delete button', async () => {
    mockStore.customModels = [
      {
        id: 'test-model',
        name: 'Test Model',
        type: 'mock'
      }
    ]
    
    render(<ChatModelManager isOpen={true} onClose={() => {}} />)
    
    fireEvent.click(screen.getByTitle('删除'))
    
    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalledWith('确定要删除模型"test-model"吗？')
      expect(mockStore.removeCustomModel).toHaveBeenCalledWith('test-model')
    })
  })

  test('should edit model when clicking edit button', () => {
    mockStore.customModels = [
      {
        id: 'test-model',
        name: 'Test Model',
        type: 'mock',
        baseUrl: 'mock://test',
        headers: { 'X-Test': 'true' }
      }
    ]
    
    render(<ChatModelManager isOpen={true} onClose={() => {}} />)
    
    fireEvent.click(screen.getByTitle('编辑'))
    
    // 验证表单被填充
    expect(screen.getByDisplayValue('test-model')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Model')).toBeInTheDocument()
    expect(screen.getByDisplayValue('mock://test')).toBeInTheDocument()
    expect(screen.getByText('编辑模型')).toBeInTheDocument()
  })

  test('should test model connection', async () => {
    render(<ChatModelManager isOpen={true} onClose={() => {}} />)
    
    // 填写必要字段
    fireEvent.change(screen.getByLabelText('模型ID *'), {
      target: { value: 'test-model' }
    })
    fireEvent.change(screen.getByLabelText('显示名称 *'), {
      target: { value: 'Test Model' }
    })
    
    // 点击测试按钮
    fireEvent.click(screen.getByText('测试连接'))
    
    // 等待测试完成
    await waitFor(() => {
      expect(screen.getByText('✅ 连接成功')).toBeInTheDocument()
      expect(screen.getByText('Test response')).toBeInTheDocument()
    })
  })

  test('should disable test button when required fields are empty', () => {
    render(<ChatModelManager isOpen={true} onClose={() => {}} />)
    
    const testButton = screen.getByText('测试连接')
    expect(testButton).toBeDisabled()
    
    // 填写ID
    fireEvent.change(screen.getByLabelText('模型ID *'), {
      target: { value: 'test-id' }
    })
    expect(testButton).toBeDisabled()
    
    // 填写名称后应该启用
    fireEvent.change(screen.getByLabelText('显示名称 *'), {
      target: { value: 'Test Name' }
    })
    expect(testButton).not.toBeDisabled()
  })
})