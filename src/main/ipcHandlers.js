const { ipcMain, dialog } = require('electron')
const fs = require('fs/promises')
const path = require('path')

function toEntry(rootPath, name, isDir) {
  const fullPath = path.join(rootPath, name)
  return isDir
    ? { name, type: 'directory', path: fullPath }
    : { name, type: 'file', path: fullPath }
}

async function listDir(dirPath) {
  const dirents = await fs.readdir(dirPath, { withFileTypes: true })
  const entries = await Promise.all(
    dirents.map(async (d) => {
      const isDir = d.isDirectory()
      const entry = toEntry(dirPath, d.name, isDir)
      if (isDir) {
        entry.children = await listDir(entry.path)
      }
      return entry
    })
  )
  return entries
}

function registerIpcHandlers() {
  let watcher = null
  ipcMain.handle('read-file', async (_event, filePath) => {
    return fs.readFile(filePath, 'utf-8')
  })

  ipcMain.handle('write-file', async (_event, filePath, content) => {
    await fs.writeFile(filePath, content ?? '')
    return true
  })

  ipcMain.handle('create-folder', async (_event, dirPath) => {
    await fs.mkdir(dirPath, { recursive: true })
    return true
  })

  ipcMain.handle('rename-path', async (_event, oldPath, newName) => {
    const newPath = path.join(path.dirname(oldPath), newName)
    await fs.rename(oldPath, newPath)
    return true
  })

  ipcMain.handle('delete-path', async (_event, targetPath) => {
    await fs.rm(targetPath, { recursive: true, force: true })
    return true
  })

  ipcMain.handle('select-directory', async () => {
    const res = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    const canceled = res?.canceled
    const selected = res?.filePaths?.[0]
    if (canceled || !selected) return []
    const entries = await listDir(selected)
    return { rootPath: selected, entries }
  })

  ipcMain.handle('read-directory', async (_event, dirPath) => {
    return listDir(dirPath)
  })

  ipcMain.handle('watch-directory', async (event, dirPath) => {
    if (watcher) {
      try { await watcher.close() } catch (_) {}
      watcher = null
    }
    const chokidar = require('chokidar')
    watcher = chokidar.watch(dirPath, { ignoreInitial: true })
    const send = (evt, p) => {
      try {
        event.sender.send('file-changed', { event: evt, path: p })
      } catch (_) {}
    }
    watcher.on('add', p => send('add', p))
    watcher.on('change', p => send('change', p))
    watcher.on('unlink', p => send('unlink', p))
    return true
  })

  ipcMain.handle('stop-watching', async () => {
    if (watcher) {
      try { await watcher.close() } catch (_) {}
      watcher = null
    }
    return true
  })
}

module.exports = { registerIpcHandlers, listDir, toEntry }

