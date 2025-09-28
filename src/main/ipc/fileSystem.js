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

