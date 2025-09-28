import React from 'react'
import { render, screen } from '@testing-library/react'
import App from './App'

jest.mock('./components/Chat/ChatPanel', () => ({
  ChatPanel: () => <div data-testid="chat-panel">Chat Panel</div>
}))

jest.mock('./components/FileTree', () => ({
  FileTree: () => <div data-testid="file-tree">File Tree</div>
}))

jest.mock('./components/FilePreview', () => ({
  FilePreview: () => <div data-testid="file-preview">File Preview</div>
}))

describe('App Layout', () => {
  test('应显示 Tree / Preview / ChatPanel 三栏', () => {
    render(<App />)
    expect(screen.getByTestId('file-tree')).toBeInTheDocument()
    expect(screen.getByTestId('file-preview')).toBeInTheDocument()
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument()
  })
})

