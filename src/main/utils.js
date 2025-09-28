const path = require('path');
const { pathToFileURL } = require('url');

function resolveIndexUrl(options = {}) {
  const {
    isDev = process.env.NODE_ENV === 'development',
    devServerUrl,
    prodIndexPath
  } = options;

  if (isDev) {
    const urlFromArg = devServerUrl && String(devServerUrl).trim();
    if (urlFromArg) return urlFromArg;

    const urlFromEnv = process.env.VITE_DEV_SERVER_URL && String(process.env.VITE_DEV_SERVER_URL).trim();
    if (urlFromEnv) return urlFromEnv;

    return 'http://localhost:3001';
  }

  const resolvedPath = prodIndexPath
    ? path.resolve(prodIndexPath)
    : path.resolve(__dirname, '../../dist/index.html');

  return String(pathToFileURL(resolvedPath));
}

module.exports = {
  resolveIndexUrl
};

