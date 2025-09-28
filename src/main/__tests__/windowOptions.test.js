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
});

