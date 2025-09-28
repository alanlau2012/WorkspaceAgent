const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件系统相关API
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  readChildren: (dirPath) => ipcRenderer.invoke('read-children', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  deletePath: (targetPath) => ipcRenderer.invoke('delete-path', targetPath),
  renamePath: (oldPath, newName) => ipcRenderer.invoke('rename-path', oldPath, newName),
  watchDirectory: (directoryPath) => ipcRenderer.invoke('watch-directory', directoryPath),
  stopWatching: () => ipcRenderer.invoke('stop-watching'),
  
  // 监听文件变化事件
  onFileChanged: (callback) => ipcRenderer.on('file-changed', callback),
  removeFileChangedListener: (callback) => ipcRenderer.removeListener('file-changed', callback)
});


