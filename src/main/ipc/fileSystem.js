const path = require('path')

function registerFileSystemIpc(deps) {
  const {
    ipcMain,
    dialog,
    chokidar,
    buildFSTree,
    getBrowserWindows,
    fs: injectedFs
  } = deps

  const fs = injectedFs || require('fs/promises')

  let watcher = null

  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { rootPath: '', tree: [] }
    }
    const rootPath = result.filePaths[0]
    const tree = await buildFSTree(rootPath, {})
    return { rootPath, tree }
  })

  ipcMain.handle('read-file', async (_event, filePath) => {
    const ext = (filePath.split('.').pop() || '').toLowerCase()
    const stat = await (injectedFs && injectedFs.stat ? injectedFs.stat(filePath) : require('fs').promises.stat(filePath))
    const max = 1024 * 1024
    if (stat.size > max) {
      throw new Error('FILE_TOO_LARGE')
    }
    if (['png','jpg','jpeg','gif','bmp','webp','svg'].includes(ext)) {
      const data = await fs.readFile(filePath)
      const base64 = Buffer.from(data).toString('base64')
      const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`
      return `data:${mime};base64,${base64}`
    }
    return fs.readFile(filePath, 'utf-8')
  })

  ipcMain.handle('write-file', async (_event, filePath, content) => {
    await fs.writeFile(filePath, content ?? '', 'utf-8')
    return { status: 'ok' }
  })

  ipcMain.handle('watch-directory', async (_event, dirPath) => {
    if (watcher) {
      await watcher.close()
      watcher = null
    }
    watcher = chokidar.watch(dirPath, { ignoreInitial: true })
    watcher.on('all', (event, changedPath) => {
      const wins = getBrowserWindows()
      wins.forEach(w => w.webContents && w.webContents.send('file-changed', { event, path: changedPath }))
    })
    return { status: 'watching' }
  })

  ipcMain.handle('stop-watching', async () => {
    if (watcher) {
      await watcher.close()
      watcher = null
    }
    return { status: 'stopped' }
  })
}

module.exports = {
  registerFileSystemIpc
}

