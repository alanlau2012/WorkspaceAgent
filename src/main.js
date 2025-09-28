const { app, BrowserWindow } = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('./main/ipcHandlers');
const { getWindowOptions } = require('./main/windowOptions');
const { registerFileSystemIpc } = require('./main/ipc/fileSystem');

function createWindow() {
  const win = new BrowserWindow(getWindowOptions());

  // 根据环境加载不同的入口
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3001');
    // 开发环境打开DevTools
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  registerIpcHandlers();
  registerFileSystemIpc(require('electron').ipcMain);
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
