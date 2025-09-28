/**
 * @jest-environment node
 */

const path = require('path');

describe('createWindow (main process)', () => {
  const ORIGINAL_ENV = process.env;
  let mockBrowserWindow;
  let createdOptions;
  let loadURL;
  let openDevTools;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    createdOptions = undefined;
    loadURL = jest.fn();
    openDevTools = jest.fn();

    mockBrowserWindow = jest.fn((opts) => {
      createdOptions = opts;
      return {
        loadURL,
        webContents: { openDevTools }
      };
    });

    jest.mock('electron', () => ({
      BrowserWindow: mockBrowserWindow,
      app: {
        on: jest.fn(),
        quit: jest.fn()
      }
    }));
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('在开发环境使用 devServerUrl 并打开 DevTools，且正确设置 preload', () => {
    process.env.NODE_ENV = 'development';
    process.env.VITE_DEV_SERVER_URL = 'http://localhost:3001';

    const expectedPreload = path.resolve(__dirname, '../../preload.js');
    const { createWindow } = require('../../main');

    createWindow();

    expect(mockBrowserWindow).toHaveBeenCalled();
    expect(createdOptions.webPreferences.preload).toBe(expectedPreload);
    expect(loadURL).toHaveBeenCalledWith('http://localhost:3001');
    expect(openDevTools).toHaveBeenCalled();
  });

  it('在生产环境加载 file:// URL（使用 dist/index.html）且不打开 DevTools', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.VITE_DEV_SERVER_URL;

    const { pathToFileURL } = require('url');
    const expectedFileUrl = String(
      pathToFileURL(path.resolve(__dirname, '../../../dist/index.html'))
    );

    const { createWindow } = require('../../main');
    createWindow();

    expect(loadURL).toHaveBeenCalledWith(expectedFileUrl);
    expect(openDevTools).not.toHaveBeenCalled();
  });
});

