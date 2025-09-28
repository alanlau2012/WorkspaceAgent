const { ipcMain, dialog } = require('electron')
const fs = require('fs/promises')
const path = require('path')

function toEntry(root, name, isDir) {
  const p = path.join(root, name)
  return isDir ? { name, type: 'directory', path: p } : { name, type: 'file', path: p }
}

async function listDir(dir) {
  const names = await fs.readdir(dir, { withFileTypes: true })
  const entries = await Promise.all(names.map(async d => {
    const isDir = d.isDirectory()
    const e = toEntry(dir, d.name, isDir)
    if (isDir) e.children = await listDir(e.path) // 简化：递归全量
    return e
  }))
  return entries
}

function registerIpcHandlers() {
  ipcMain.handle('read-file', async (_e, filePath) => fs.readFile(filePath, 'utf-8'))
  
  ipcMain.handle('write-file', async (_e, filePath, content) => {
    await fs.writeFile(filePath, content ?? '')
    return true
  })
  
  ipcMain.handle('create-folder', async (_e, dirPath) => {
    await fs.mkdir(dirPath, { recursive: true })
    return true
  })
  
  ipcMain.handle('rename-path', async (_e, oldPath, newName) => {
    const newPath = path.join(path.dirname(oldPath), newName)
    await fs.rename(oldPath, newPath)
    return true
  })
  
  ipcMain.handle('delete-path', async (_e, targetPath) => {
    await fs.rm(targetPath, { recursive: true, force: true })
    return true
  })
  
  ipcMain.handle('select-directory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (canceled || !filePaths?.[0]) return []
    const rootPath = filePaths[0]
    const entries = await listDir(rootPath)
    return { rootPath, entries }
  })
  
  ipcMain.handle('read-directory', async (_e, dirPath) => listDir(dirPath))
}

module.exports = {
  registerIpcHandlers
}
