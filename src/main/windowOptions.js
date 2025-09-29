const path = require('path');

function getWindowOptions() {
  return {
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, '..', 'preload.js'),
    },
  };
}

module.exports = { getWindowOptions };

