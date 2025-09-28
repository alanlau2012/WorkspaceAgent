const { ipcMain } = require('electron')
const fs = require('fs/promises')
const { shell } = require('electron')

function registerIpcHandlers() {
  ipcMain.handle('read-file', async (_event, filePath) => {
    return fs.readFile(filePath, 'utf-8')
  })

  ipcMain.handle('write-file', async (_event, filePath, content) => {
    await fs.writeFile(filePath, content, 'utf-8')
    return true
  })

  ipcMain.handle('select-directory', async () => {
    const result = await require('electron').dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('read-directory', async (_event, dirPath) => {
    const names = await fs.readdir(dirPath, { withFileTypes: true })
    return names.map(d => ({
      name: d.name,
      path: require('path').join(dirPath, d.name),
      isDirectory: d.isDirectory(),
      children: d.isDirectory() ? [] : undefined // 浅层结构，目录有空数组，文件无children
    }))
  })

  ipcMain.handle('read-children', async (_event, dirPath) => {
    try {
      const names = await fs.readdir(dirPath, { withFileTypes: true })
      return names.map(d => ({
        name: d.name,
        path: require('path').join(dirPath, d.name),
        isDirectory: d.isDirectory(),
        children: d.isDirectory() ? [] : undefined // 浅层结构
      }))
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('delete-path', async (_event, targetPath) => {
    try {
      // 优先使用回收站
      await shell.trashItem(targetPath)
      return { success: true, method: 'trash' }
    } catch (error) {
      // 如果回收站不可用，回退到永久删除
      try {
        await fs.rm(targetPath, { recursive: true, force: true })
        return { success: true, method: 'permanent' }
      } catch (fsError) {
        return { success: false, error: fsError.message }
      }
    }
  })

  ipcMain.handle('rename-path', async (_event, oldPath, newName) => {
    try {
      const path = require('path')
      const newPath = path.join(path.dirname(oldPath), newName)
      await fs.rename(oldPath, newPath)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('watch-directory', async (_event, directoryPath) => {
    // 这里应该实现文件监听逻辑
    return true
  })

  ipcMain.handle('stop-watching', async () => {
    // 这里应该实现停止文件监听逻辑
    return true
  })
}

module.exports = {
  registerIpcHandlers
}

