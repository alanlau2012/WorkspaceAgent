const { app } = require('electron');
const path = require('path');

/**
 * 获取窗口选项配置
 * @returns {Object} 窗口选项
 */
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
      preload: path.join(process.cwd(), 'src', 'preload.js'),
    },
  };
}

module.exports = { getWindowOptions };