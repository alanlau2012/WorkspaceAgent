const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const chokidar = require('chokidar')
const { registerFileSystemIpc } = require('./ipc/fileSystem')
const { buildFSTree } = require('../shared/fsTree')

function registerIpcHandlers() {
  registerFileSystemIpc({
    ipcMain,
    dialog,
    chokidar,
    buildFSTree,
    getBrowserWindows: () => BrowserWindow.getAllWindows()
  })
}

module.exports = {
  registerIpcHandlers
}

