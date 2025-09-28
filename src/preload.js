const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  createFolder: (dirPath) => ipcRenderer.invoke('create-folder', dirPath),
  renamePath: (oldPath, newName) => ipcRenderer.invoke('rename-path', oldPath, newName),
  deletePath: (targetPath) => ipcRenderer.invoke('delete-path', targetPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  watchDirectory: (directoryPath) => ipcRenderer.invoke('watch-directory', directoryPath),
  stopWatching: () => ipcRenderer.invoke('stop-watching'),
  onFileChanged: (callback) => ipcRenderer.on('file-changed', callback),
  removeFileChangedListener: (callback) => ipcRenderer.removeListener('file-changed', callback)
})

