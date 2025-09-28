import React, { useState, useEffect } from 'react'
import { useChatStore } from '../../stores/chatStore'
import './ChatModelManager.css'

export const ChatModelManager = ({ isOpen, onClose }) => {
  const {
    customModels = [],
    addCustomModel,
    removeCustomModel,
    updateCustomModel
  } = useChatStore()

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    type: 'mock',
    baseUrl: '',
    model: '',
    apiKey: '',
    headers: '{}',
    disabled: false
  })

  const [errors, setErrors] = useState({})
  const [isEditing, setIsEditing] = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    if (isOpen) {
      // 重置表单
      setFormData({
        id: '',
        name: '',
        type: 'mock',
        baseUrl: '',
        model: '',
        apiKey: '',
        headers: '{}',
        disabled: false
      })
      setErrors({})
      setIsEditing(false)
      setTestResult(null)
    }
  }, [isOpen])

  const validateForm = () => {
    const newErrors = {}

    if (!formData.id.trim()) {
      newErrors.id = '模型ID不能为空'
    } else if (!/^[a-zA-Z0-9-_]+$/.test(formData.id)) {
      newErrors.id = '模型ID只能包含字母、数字、连字符和下划线'
    }

    if (!formData.name.trim()) {
      newErrors.name = '模型名称不能为空'
    }

    // 验证Headers JSON格式
    if (formData.headers) {
      try {
        JSON.parse(formData.headers)
      } catch (e) {
        newErrors.headers = '请输入有效的JSON格式'
      }
    }

    // 检查ID是否重复（非编辑模式下）
    if (!isEditing && customModels.find(m => m.id === formData.id)) {
      newErrors.id = '模型ID已存在，将覆盖原有配置'
      // 这是警告而非错误，不会阻止提交
    }

    setErrors(newErrors)
    return Object.keys(newErrors).filter(key => !newErrors[key].includes('已存在')).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      // 转换headers字符串为对象
      const headers = formData.headers ? JSON.parse(formData.headers) : {}
      
      const modelConfig = {
        ...formData,
        headers
      }

      if (isEditing) {
        await updateCustomModel(formData.id, modelConfig)
      } else {
        await addCustomModel(modelConfig)
      }

      // 重置表单并关闭
      setFormData({
        id: '',
        name: '',
        type: 'mock',
        baseUrl: '',
        model: '',
        apiKey: '',
        headers: '{}',
        disabled: false
      })
      setIsEditing(false)
      onClose()
    } catch (error) {
      setErrors({ submit: `保存失败: ${error.message}` })
    }
  }

  const handleEdit = (model) => {
    setFormData({
      id: model.id || '',
      name: model.name || '',
      type: model.type || 'mock',
      baseUrl: model.baseUrl || '',
      model: model.model || '',
      apiKey: model.apiKey || '',
      headers: JSON.stringify(model.headers || {}, null, 2),
      disabled: model.disabled || false
    })
    setIsEditing(true)
  }

  const handleDelete = async (modelId) => {
    if (confirm(`确定要删除模型"${modelId}"吗？`)) {
      try {
        await removeCustomModel(modelId)
      } catch (error) {
        setErrors({ submit: `删除失败: ${error.message}` })
      }
    }
  }

  const handleTestModel = async () => {
    if (!formData.id || !formData.name) {
      setErrors({ test: '请先填写模型ID和名称' })
      return
    }

    try {
      setTestResult({ loading: true })
      
      // 创建临时模型进行测试
      const { llmClient } = await import('../../services/llmClient')
      const { createMaasMockProvider } = await import('../../services/maasMockProvider')
      
      const tempConfig = {
        ...formData,
        headers: formData.headers ? JSON.parse(formData.headers) : {}
      }
      
      const provider = createMaasMockProvider(tempConfig)
      const testId = `test-${formData.id}-${Date.now()}`
      
      // 临时注册用于测试
      llmClient.registerModel(testId, provider)
      
      // 发送测试消息
      const response = await llmClient.sendMessage({
        model: testId,
        messages: [{ role: 'user', content: '测试连接' }],
        context: null,
        config: tempConfig
      })
      
      // 清理临时模型
      llmClient.unregisterModel(testId)
      
      setTestResult({
        success: true,
        response: response.content,
        usage: response.usage
      })
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message
      })
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
    // 清除测试结果
    if (testResult) {
      setTestResult(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="model-manager-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="model-manager-dialog" role="dialog" aria-labelledby="dialog-title">
        <div className="model-manager-header">
          <h3 id="dialog-title">自定义模型管理</h3>
          <button className="close-btn" onClick={onClose} title="关闭">
            ✕
          </button>
        </div>

        <div className="model-manager-content">
          {/* 模型列表 */}
          <div className="model-list-section">
            <h4>已添加的模型</h4>
            {customModels.length === 0 ? (
              <div className="empty-models">
                <span>暂无自定义模型</span>
              </div>
            ) : (
              <div className="model-list">
                {customModels.map(model => (
                  <div key={model.id} className={`model-item ${model.disabled ? 'disabled' : ''}`}>
                    <div className="model-info">
                      <div className="model-name">{model.name}</div>
                      <div className="model-details">
                        ID: {model.id} | 类型: {model.type}
                        {model.baseUrl && <span> | URL: {model.baseUrl}</span>}
                      </div>
                    </div>
                    <div className="model-actions">
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(model)}
                        title="编辑"
                      >
                        ✏️
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(model.id)}
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 添加/编辑表单 */}
          <div className="model-form-section">
            <h4>{isEditing ? '编辑模型' : '添加新模型'}</h4>
            <form onSubmit={handleSubmit} className="model-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="model-id">模型ID *</label>
                  <input
                    id="model-id"
                    type="text"
                    value={formData.id}
                    onChange={(e) => handleInputChange('id', e.target.value)}
                    placeholder="例如: my-custom-model"
                    disabled={isEditing}
                    className={errors.id ? 'error' : ''}
                  />
                  {errors.id && <span className="error-text">{errors.id}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="model-name">显示名称 *</label>
                  <input
                    id="model-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="例如: 我的自定义模型"
                    className={errors.name ? 'error' : ''}
                  />
                  {errors.name && <span className="error-text">{errors.name}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="model-type">类型</label>
                  <select
                    id="model-type"
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                  >
                    <option value="mock">Mock (测试)</option>
                    <option value="maas">MaaS (模型即服务)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="model-url">Base URL</label>
                  <input
                    id="model-url"
                    type="text"
                    value={formData.baseUrl}
                    onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                    placeholder="例如: https://api.example.com/v1"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="model-model">默认模型名</label>
                  <input
                    id="model-model"
                    type="text"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    placeholder="例如: gpt-3.5-turbo"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="model-apikey">API Key</label>
                  <input
                    id="model-apikey"
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => handleInputChange('apiKey', e.target.value)}
                    placeholder="可选"
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="model-headers">Headers (JSON)</label>
                <textarea
                  id="model-headers"
                  value={formData.headers}
                  onChange={(e) => handleInputChange('headers', e.target.value)}
                  placeholder='{"Content-Type": "application/json"}'
                  rows="3"
                  className={errors.headers ? 'error' : ''}
                />
                {errors.headers && <span className="error-text">{errors.headers}</span>}
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.disabled}
                    onChange={(e) => handleInputChange('disabled', e.target.checked)}
                  />
                  禁用此模型
                </label>
              </div>

              {errors.submit && <div className="error-text">{errors.submit}</div>}

              <div className="form-actions">
                <button
                  type="button"
                  className="test-btn"
                  onClick={handleTestModel}
                  disabled={!formData.id || !formData.name}
                >
                  {testResult?.loading ? '测试中...' : '测试连接'}
                </button>
                <button type="submit" className="submit-btn">
                  {isEditing ? '更新' : '添加'}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => {
                      setIsEditing(false)
                      setFormData({
                        id: '',
                        name: '',
                        type: 'mock',
                        baseUrl: '',
                        model: '',
                        apiKey: '',
                        headers: '{}',
                        disabled: false
                      })
                    }}
                  >
                    取消编辑
                  </button>
                )}
              </div>
            </form>

            {/* 测试结果 */}
            {testResult && !testResult.loading && (
              <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                <h5>测试结果</h5>
                {testResult.success ? (
                  <div>
                    <p>✅ 连接成功</p>
                    <p><strong>响应:</strong> {testResult.response}</p>
                    {testResult.usage && (
                      <p><strong>Token使用:</strong> {testResult.usage.tokens}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p>❌ 连接失败</p>
                    <p><strong>错误:</strong> {testResult.error}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}