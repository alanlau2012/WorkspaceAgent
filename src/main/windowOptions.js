function getWindowOptions() {
  return {
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  };
}

module.exports = { getWindowOptions };

