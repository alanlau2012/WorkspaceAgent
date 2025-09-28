const { ipcMain } = require('electron')
const fs = require('fs/promises')

function registerIpcHandlers() {
  ipcMain.handle('read-file', async (_event, filePath) => {
    return fs.readFile(filePath, 'utf-8')
  })
}

module.exports = {
  registerIpcHandlers
}

