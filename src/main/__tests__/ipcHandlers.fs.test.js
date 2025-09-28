const { registerIpcHandlers } = require('../ipcHandlers')
const { ipcMain, dialog } = require('electron')
const fs = require('fs/promises')
const path = require('path')

// Mock electron modules
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn()
  },
  dialog: {
    showOpenDialog: jest.fn()
  }
}))

// Mock fs/promises
jest.mock('fs/promises')

describe('IPC Handlers - File System Operations', () => {
  let handlers = {}

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    handlers = {}
    
    // Capture handlers when they are registered
    ipcMain.handle.mockImplementation((channel, handler) => {
      handlers[channel] = handler
    })
    
    // Register handlers
    registerIpcHandlers()
  })

  describe('select-directory', () => {
    it('应该返回选中目录的根路径和条目列表', async () => {
      const mockRootPath = '/test/directory'
      const mockFiles = ['file1.txt', 'folder1']
      const mockStats = [
        { isDirectory: () => false },
        { isDirectory: () => true }
      ]

      dialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: [mockRootPath]
      })
      
      fs.readdir.mockResolvedValue([
        { name: 'file1.txt', isDirectory: () => false },
        { name: 'folder1', isDirectory: () => true }
      ])
      
      // Mock nested directory reading for folder1
      fs.readdir.mockImplementation((dir) => {
        if (dir === mockRootPath) {
          return [
            { name: 'file1.txt', isDirectory: () => false },
            { name: 'folder1', isDirectory: () => true }
          ]
        }
        if (dir === path.join(mockRootPath, 'folder1')) {
          return [{ name: 'nested.txt', isDirectory: () => false }]
        }
        return []
      })

      const result = await handlers['select-directory']()

      expect(dialog.showOpenDialog).toHaveBeenCalledWith({
        properties: ['openDirectory']
      })
      expect(result).toHaveProperty('rootPath', mockRootPath)
      expect(result).toHaveProperty('entries')
      expect(Array.isArray(result.entries)).toBe(true)
    })

    it('应该在用户取消时返回空数组', async () => {
      dialog.showOpenDialog.mockResolvedValue({
        canceled: true,
        filePaths: []
      })

      const result = await handlers['select-directory']()

      expect(result).toEqual([])
    })

    it('应该在没有选择路径时返回空数组', async () => {
      dialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: []
      })

      const result = await handlers['select-directory']()

      expect(result).toEqual([])
    })
  })

  describe('read-directory', () => {
    it('应该读取指定目录的内容', async () => {
      const testDir = '/test/dir'
      fs.readdir.mockResolvedValue([
        { name: 'file1.txt', isDirectory: () => false },
        { name: 'subfolder', isDirectory: () => true }
      ])

      // Mock nested reading
      fs.readdir.mockImplementation((dir) => {
        if (dir === testDir) {
          return [
            { name: 'file1.txt', isDirectory: () => false },
            { name: 'subfolder', isDirectory: () => true }
          ]
        }
        if (dir === path.join(testDir, 'subfolder')) {
          return []
        }
        return []
      })

      const result = await handlers['read-directory'](null, testDir)

      expect(fs.readdir).toHaveBeenCalledWith(testDir, { withFileTypes: true })
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
      
      // Check file entry
      const fileEntry = result.find(e => e.name === 'file1.txt')
      expect(fileEntry).toMatchObject({
        name: 'file1.txt',
        type: 'file',
        path: path.join(testDir, 'file1.txt')
      })
      
      // Check directory entry
      const dirEntry = result.find(e => e.name === 'subfolder')
      expect(dirEntry).toMatchObject({
        name: 'subfolder',
        type: 'directory',
        path: path.join(testDir, 'subfolder')
      })
      expect(dirEntry).toHaveProperty('children')
    })
  })

  describe('create-folder', () => {
    it('应该创建文件夹并返回true', async () => {
      const folderPath = '/test/newfolder'
      fs.mkdir.mockResolvedValue()

      const result = await handlers['create-folder'](null, folderPath)

      expect(fs.mkdir).toHaveBeenCalledWith(folderPath, { recursive: true })
      expect(result).toBe(true)
    })

    it('应该在创建失败时抛出错误', async () => {
      const folderPath = '/test/invalid'
      const error = new Error('Permission denied')
      fs.mkdir.mockRejectedValue(error)

      await expect(handlers['create-folder'](null, folderPath))
        .rejects.toThrow('Permission denied')
    })
  })

  describe('rename-path', () => {
    it('应该重命名文件/文件夹并返回true', async () => {
      const oldPath = '/test/oldname'
      const newName = 'newname'
      const expectedNewPath = path.join(path.dirname(oldPath), newName)
      fs.rename.mockResolvedValue()

      const result = await handlers['rename-path'](null, oldPath, newName)

      expect(fs.rename).toHaveBeenCalledWith(oldPath, expectedNewPath)
      expect(result).toBe(true)
    })

    it('应该在重命名失败时抛出错误', async () => {
      const oldPath = '/test/oldname'
      const newName = 'newname'
      const error = new Error('File not found')
      fs.rename.mockRejectedValue(error)

      await expect(handlers['rename-path'](null, oldPath, newName))
        .rejects.toThrow('File not found')
    })
  })

  describe('delete-path', () => {
    it('应该删除文件/文件夹并返回true', async () => {
      const targetPath = '/test/todelete'
      fs.rm.mockResolvedValue()

      const result = await handlers['delete-path'](null, targetPath)

      expect(fs.rm).toHaveBeenCalledWith(targetPath, { 
        recursive: true, 
        force: true 
      })
      expect(result).toBe(true)
    })

    it('应该在删除失败时抛出错误', async () => {
      const targetPath = '/test/protected'
      const error = new Error('Permission denied')
      fs.rm.mockRejectedValue(error)

      await expect(handlers['delete-path'](null, targetPath))
        .rejects.toThrow('Permission denied')
    })
  })

  describe('write-file', () => {
    it('应该写入文件内容并返回true', async () => {
      const filePath = '/test/file.txt'
      const content = 'Hello World'
      fs.writeFile.mockResolvedValue()

      const result = await handlers['write-file'](null, filePath, content)

      expect(fs.writeFile).toHaveBeenCalledWith(filePath, content)
      expect(result).toBe(true)
    })

    it('应该在写入空内容时使用空字符串', async () => {
      const filePath = '/test/empty.txt'
      fs.writeFile.mockResolvedValue()

      const result = await handlers['write-file'](null, filePath, null)

      expect(fs.writeFile).toHaveBeenCalledWith(filePath, '')
      expect(result).toBe(true)
    })

    it('应该在写入失败时抛出错误', async () => {
      const filePath = '/test/readonly.txt'
      const content = 'content'
      const error = new Error('Read-only file')
      fs.writeFile.mockRejectedValue(error)

      await expect(handlers['write-file'](null, filePath, content))
        .rejects.toThrow('Read-only file')
    })
  })

  describe('read-file (existing handler)', () => {
    it('应该读取文件内容', async () => {
      const filePath = '/test/file.txt'
      const content = 'File content'
      const mockStat = { size: 100 }
      
      fs.stat.mockResolvedValue(mockStat)
      fs.readFile.mockResolvedValue(content)

      const result = await handlers['read-file'](null, filePath)

      expect(fs.stat).toHaveBeenCalledWith(filePath)
      expect(fs.readFile).toHaveBeenCalledWith(filePath, 'utf-8')
      expect(result).toEqual({ type: 'text', content, size: 100 })
    })
  })
})