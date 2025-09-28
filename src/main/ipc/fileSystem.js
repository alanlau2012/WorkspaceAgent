const chokidar = require('chokidar')

function registerFileSystemIpc(ipcMain) {
  let watcher = null;

  ipcMain.handle('watch-directory', async (event, dirPath) => {
    if (watcher) {
      await watcher.close();
      watcher = null;
    }
    watcher = chokidar.watch(dirPath, { ignoreInitial: true });
    const send = (evt, p) => {
      event.sender.send('file-changed', { event: evt, path: p });
    };
    watcher.on('add', p => send('add', p));
    watcher.on('change', p => send('change', p));
    watcher.on('unlink', p => send('unlink', p));
    watcher.on('addDir', p => send('addDir', p));
    watcher.on('unlinkDir', p => send('unlinkDir', p));
    return true;
  });

  ipcMain.handle('stop-watching', async () => {
    if (watcher) {
      await watcher.close();
      watcher = null;
    }
    return true;
  });
}

module.exports = { registerFileSystemIpc }