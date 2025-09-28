const { ipcMain, dialog, shell } = require('electron')
const fs = require('fs/promises')
const path = require('path')

function registerIpcHandlers() {
  ipcMain.handle('read-file', async (_event, filePath) => {
    return fs.readFile(filePath, 'utf-8')
  })

  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    
    if (result.canceled) {
      return null
    }
    
    const dirPath = result.filePaths[0]
    const entries = await listDir(dirPath)
    
    return {
      rootPath: dirPath,
      entries
    }
  })

  ipcMain.handle('read-directory', async (_event, dirPath) => {
    return listDir(dirPath)
  })

  ipcMain.handle('read-children', async (_event, dirPath) => {
    return listDir(dirPath)
  })

  ipcMain.handle('delete-path', async (_event, targetPath) => {
    try {
      // 优先使用回收站
      await shell.trashItem(targetPath)
      return { success: true, method: 'trash' }
    } catch (error) {
      // 如果回收站失败，回退到永久删除
      try {
        await fs.rm(targetPath, { recursive: true, force: true })
        return { success: true, method: 'permanent', warning: '文件已永久删除（回收站不可用）' }
      } catch (rmError) {
        throw new Error(`删除失败: ${rmError.message}`)
      }
    }
  })

  ipcMain.handle('rename-path', async (_event, oldPath, newName) => {
    // 验证新名称
    if (!newName || newName.trim() === '') {
      throw new Error('文件名不能为空')
    }
    
    if (newName.includes('/') || newName.includes('\\') || newName.includes(':')) {
      throw new Error('文件名不能包含路径分隔符')
    }
    
    const dir = path.dirname(oldPath)
    const newPath = path.join(dir, newName)
    
    try {
      await fs.rename(oldPath, newPath)
      return { success: true, newPath }
    } catch (error) {
      throw new Error(`重命名失败: ${error.message}`)
    }
  })
}

async function listDir(dir) {
  const names = await fs.readdir(dir, { withFileTypes: true })
  const entries = await Promise.all(names.map(async d => {
    const isDir = d.isDirectory()
    const e = toEntry(dir, d.name, isDir)
    if (isDir) e.children = [] // 浅层遍历，不递归
    return e
  }))
  return entries
}

function toEntry(dir, name, isDir) {
  return {
    name,
    type: isDir ? 'directory' : 'file',
    path: path.join(dir, name),
    children: isDir ? [] : undefined
  }
}

module.exports = {
  registerIpcHandlers
}

