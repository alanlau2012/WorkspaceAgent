const { app, BrowserWindow } = require('electron');
const { getWindowOptions } = require('./main/windowOptions');

function createWindow() {
  const win = new BrowserWindow(getWindowOptions());

  win.loadFile('src/index.html');
}

app.whenReady().then(() => {
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
