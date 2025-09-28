import { act } from '@testing-library/react'
import { create } from 'zustand'
import { useChatStore as realUseChatStore } from '../chatStore'

describe('chatStore', () => {
  let useChatStore
  beforeEach(() => {
    // 每次测试隔离一个新的 store
    const { useChatStore: _store } = jest.requireActual('../chatStore')
    useChatStore = _store
  })

  test('应当初始化状态', () => {
    const state = useChatStore.getState()
    expect(Array.isArray(state.messages)).toBe(true)
    expect(state.selectedModel).toBe('mock-echo')
    expect(state.isStreaming).toBe(false)
    expect(state.currentInput).toBe('')
  })

  test('发送消息流程（echo 模型）', async () => {
    const store = useChatStore
    const initialLen = store.getState().messages.length

    await act(async () => {
      await store.getState().sendMessage('测试')
    })

    const { messages, isStreaming } = store.getState()
    expect(messages.length).toBe(initialLen + 2)
    expect(messages[messages.length - 2].type).toBe('user')
    expect(messages[messages.length - 1].type).toBe('assistant')
    expect(messages[messages.length - 1].content).toContain('回声: 测试')
    expect(isStreaming).toBe(false)
  })

  test('切换模型并发送（mock-assistant）', async () => {
    const store = useChatStore
    store.getState().setSelectedModel('mock-assistant')

    await act(async () => {
      await store.getState().sendMessage('你好')
    })

    const last = store.getState().messages.at(-1)
    expect(last.type).toBe('assistant')
    expect(last.content).toContain('你好')
  })
})

