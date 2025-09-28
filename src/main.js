const { app, BrowserWindow } = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('./main/ipcHandlers');
const { resolveIndexUrl } = require('./main/utils');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.resolve(__dirname, 'preload.js')
    }
  });

  const url = resolveIndexUrl();
  win.loadURL(url);

  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools();
  }
}

// 在 Jest 测试环境中跳过自动启动，便于单测仅验证 createWindow 行为
if (!process.env.JEST_WORKER_ID) {
  app.whenReady().then(() => {
    registerIpcHandlers();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

module.exports = { createWindow };
