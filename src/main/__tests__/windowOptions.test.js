const path = require('path');
const { getWindowOptions } = require('../windowOptions');

describe('windowOptions', () => {
  test('安全选项应启用 contextIsolation/nodeIntegration/sandbox', () => {
    const opts = getWindowOptions();
    expect(opts.webPreferences.contextIsolation).toBe(true);
    expect(opts.webPreferences.nodeIntegration).toBe(false);
    expect(opts.webPreferences.sandbox).toBe(true);
  });

  test('应配置 preload 脚本以暴露受控 API', () => {
    const opts = getWindowOptions();
    expect(opts.webPreferences.preload).toBe(
      path.join(__dirname, '..', '..', 'preload.js')
    );
  });

  test('窗口尺寸应足够大以完整显示三栏布局', () => {
    const opts = getWindowOptions();
    expect(opts.width).toBeGreaterThanOrEqual(1200);
    expect(opts.height).toBeGreaterThanOrEqual(800);
  });

  test('应设置最小窗口尺寸限制', () => {
    const opts = getWindowOptions();
    expect(opts.minWidth).toBeGreaterThanOrEqual(1024);
    expect(opts.minHeight).toBeGreaterThanOrEqual(700);
  });
});

