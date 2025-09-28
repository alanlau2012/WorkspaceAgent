import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileTree } from '../FileTree'

const mockLoadChildren = jest.fn()

jest.mock('../../hooks/useFileManager', () => ({
  useFileManager: () => ({
    files: [ { name: 'folder', type: 'directory', path: '/folder', children: [] } ],
    isLoading: false,
    error: null,
    searchFiles: jest.fn(),
    searchResults: [],
    loadChildren: mockLoadChildren
  })
}))

describe('FileTree 懒加载展开目录', () => {
  beforeEach(() => {
    mockLoadChildren.mockReset()
  })

  it('展开空目录时应调用 loadChildren', () => {
    render(<FileTree />)
    const folder = screen.getByText('folder')
    fireEvent.click(folder)
    expect(mockLoadChildren).toHaveBeenCalledWith('/folder')
  })
})

