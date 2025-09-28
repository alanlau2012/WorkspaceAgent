const { ipcMain } = require('electron')
const { registerIpcHandlers } = require('../ipcHandlers')

// Mock electron modules
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn()
  },
  dialog: {
    showOpenDialog: jest.fn()
  },
  shell: {
    trashItem: jest.fn()
  }
}))

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  readdir: jest.fn(),
  rm: jest.fn()
}))

const { shell } = require('electron')
const fs = require('fs/promises')

describe('IPC Handlers - Delete and Rename', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    registerIpcHandlers()
  })

  describe('delete-path handler', () => {
    test('should use shell.trashItem for deletion', async () => {
      const mockTrashItem = jest.fn().mockResolvedValue()
      shell.trashItem = mockTrashItem

      // Get the handler function
      const deleteHandler = ipcMain.handle.mock.calls.find(call => call[0] === 'delete-path')[1]
      
      const result = await deleteHandler(null, '/test/file.txt')
      
      expect(mockTrashItem).toHaveBeenCalledWith('/test/file.txt')
      expect(result).toEqual({ success: true, method: 'trash' })
    })

    test('should fallback to fs.rm when trashItem fails', async () => {
      const mockTrashItem = jest.fn().mockRejectedValue(new Error('Trash not available'))
      const mockRm = jest.fn().mockResolvedValue()
      shell.trashItem = mockTrashItem
      fs.rm = mockRm

      const deleteHandler = ipcMain.handle.mock.calls.find(call => call[0] === 'delete-path')[1]
      
      const result = await deleteHandler(null, '/test/file.txt')
      
      expect(mockTrashItem).toHaveBeenCalledWith('/test/file.txt')
      expect(mockRm).toHaveBeenCalledWith('/test/file.txt', { recursive: true, force: true })
      expect(result).toEqual({ 
        success: true, 
        method: 'permanent', 
        warning: '文件已永久删除（回收站不可用）' 
      })
    })

    test('should throw error when both methods fail', async () => {
      const mockTrashItem = jest.fn().mockRejectedValue(new Error('Trash not available'))
      const mockRm = jest.fn().mockRejectedValue(new Error('Delete failed'))
      shell.trashItem = mockTrashItem
      fs.rm = mockRm

      const deleteHandler = ipcMain.handle.mock.calls.find(call => call[0] === 'delete-path')[1]
      
      await expect(deleteHandler(null, '/test/file.txt')).rejects.toThrow('删除失败: Delete failed')
    })
  })

  describe('rename-path handler', () => {
    test('should validate new name and rename file', async () => {
      const mockRename = jest.fn().mockResolvedValue()
      fs.rename = mockRename

      const renameHandler = ipcMain.handle.mock.calls.find(call => call[0] === 'rename-path')[1]
      
      const result = await renameHandler(null, '/test/oldname.txt', 'newname.txt')
      
      expect(mockRename).toHaveBeenCalledWith('/test/oldname.txt', '/test/newname.txt')
      expect(result).toEqual({ success: true, newPath: '/test/newname.txt' })
    })

    test('should reject empty file names', async () => {
      const renameHandler = ipcMain.handle.mock.calls.find(call => call[0] === 'rename-path')[1]
      
      await expect(renameHandler(null, '/test/file.txt', '')).rejects.toThrow('文件名不能为空')
      await expect(renameHandler(null, '/test/file.txt', '   ')).rejects.toThrow('文件名不能为空')
    })

    test('should reject names with path separators', async () => {
      const renameHandler = ipcMain.handle.mock.calls.find(call => call[0] === 'rename-path')[1]
      
      await expect(renameHandler(null, '/test/file.txt', 'new/name.txt')).rejects.toThrow('文件名不能包含路径分隔符')
      await expect(renameHandler(null, '/test/file.txt', 'new\\name.txt')).rejects.toThrow('文件名不能包含路径分隔符')
      await expect(renameHandler(null, '/test/file.txt', 'new:name.txt')).rejects.toThrow('文件名不能包含路径分隔符')
    })

    test('should handle rename errors', async () => {
      const mockRename = jest.fn().mockRejectedValue(new Error('Permission denied'))
      fs.rename = mockRename

      const renameHandler = ipcMain.handle.mock.calls.find(call => call[0] === 'rename-path')[1]
      
      await expect(renameHandler(null, '/test/file.txt', 'newname.txt')).rejects.toThrow('重命名失败: Permission denied')
    })
  })
})