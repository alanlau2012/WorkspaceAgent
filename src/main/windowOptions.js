const path = require('path');

function getWindowOptions() {
  return {
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, '..', 'preload.js'),
    },
  };
}

module.exports = { getWindowOptions };

