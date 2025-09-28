/**
 * @jest-environment node
 */

describe('resolveIndexUrl', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.VITE_DEV_SERVER_URL;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('开发模式：优先使用传入的 devServerUrl', () => {
    const { resolveIndexUrl } = require('../utils');

    const url = resolveIndexUrl({
      isDev: true,
      devServerUrl: 'http://localhost:5173'
    });

    expect(url).toBe('http://localhost:5173');
  });

  it('开发模式：未传 devServerUrl 时回退到环境变量 VITE_DEV_SERVER_URL，再回退到默认 http://localhost:3001', () => {
    const { resolveIndexUrl } = require('../utils');

    const fallback = resolveIndexUrl({ isDev: true });
    expect(fallback).toBe('http://localhost:3001');

    process.env.VITE_DEV_SERVER_URL = 'http://127.0.0.1:9999';
    const byEnv = resolveIndexUrl({ isDev: true });
    expect(byEnv).toBe('http://127.0.0.1:9999');
  });

  it('生产模式：将本地 html 绝对路径转换为 file:// URL（使用默认路径）', () => {
    const path = require('path');
    const { resolveIndexUrl } = require('../utils');

    const url = resolveIndexUrl({ isDev: false });

    // 预期 file:// 开头，且包含 dist/index.html
    expect(url.startsWith('file://')).toBe(true);
    expect(url.replace('file://', '')).toContain(
      path.normalize(path.join('dist', 'index.html'))
    );
  });

  it('生产模式：当传入 prodIndexPath 时使用该路径生成 file:// URL', () => {
    const { pathToFileURL } = require('url');
    const path = require('path');
    const { resolveIndexUrl } = require('../utils');

    const customPath = path.resolve(__dirname, '../../../dist/index.html');
    const expected = String(pathToFileURL(customPath));

    const url = resolveIndexUrl({ isDev: false, prodIndexPath: customPath });
    expect(url).toBe(expected);
  });
});

