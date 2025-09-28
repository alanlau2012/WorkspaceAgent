const { app, BrowserWindow } = require('electron');
const { registerIpcHandlers } = require('./main/ipcHandlers')
const { registerFileSystemIpc } = (() => {
  try {
    return require('./main/ipc/fileSystem')
  } catch (e) {
    return { registerFileSystemIpc: () => {} }
  }
})()

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: require('path').join(__dirname, 'preload.js')
    }
  });

  win.loadFile('src/index.html');
}

app.whenReady().then(() => {
  // 注册主进程 IPC handlers
  try { registerIpcHandlers() } catch (_) {}
  try { registerFileSystemIpc(require('electron').ipcMain) } catch (_) {}
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
