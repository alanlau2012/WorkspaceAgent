const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件系统相关API
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  watchDirectory: (directoryPath) => ipcRenderer.invoke('watch-directory', directoryPath),
  stopWatching: () => ipcRenderer.invoke('stop-watching'),
  searchFiles: (query) => ipcRenderer.invoke('search-files', query),
  
  // 监听文件变化事件
  onFileChanged: (callback) => ipcRenderer.on('file-changed', callback),
  offFileChanged: (callback) => ipcRenderer.removeListener('file-changed', callback),
  removeFileChangedListener: (callback) => ipcRenderer.removeListener('file-changed', callback)
});


