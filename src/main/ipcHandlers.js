const { ipcMain, shell } = require('electron')
const fs = require('fs/promises')
const path = require('path')

function registerIpcHandlers() {
  ipcMain.handle('read-file', async (_event, filePath) => {
    return fs.readFile(filePath, 'utf-8')
  })

  // 懒加载：读取某目录的浅层子项
  ipcMain.handle('read-children', async (_event, dirPath) => {
    const dirents = await fs.readdir(dirPath, { withFileTypes: true })
    const children = await Promise.all(dirents.map(async d => ({
      name: d.name,
      path: path.join(dirPath, d.name),
      type: d.isDirectory() ? 'directory' : 'file',
      children: d.isDirectory() ? [] : undefined
    })))
    return children
  })

  ipcMain.handle('delete-path', async (_event, targetPath) => {
    try {
      await shell.trashItem(targetPath)
      return true
    } catch (_err) {
      await fs.rm(targetPath, { recursive: true, force: true })
      return { trashed: false, deleted: true }
    }
  })

  ipcMain.handle('rename-path', async (_event, oldPath, newName) => {
    const dir = path.dirname(oldPath)
    const newPath = path.join(dir, newName)
    await fs.rename(oldPath, newPath)
    return { ok: true }
  })
}

module.exports = {
  registerIpcHandlers
}

