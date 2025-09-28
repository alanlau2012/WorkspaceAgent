const { getWindowOptions } = require('../windowOptions');

describe('windowOptions', () => {
  test('安全选项应启用 contextIsolation/nodeIntegration/sandbox', () => {
    const opts = getWindowOptions();
    expect(opts.webPreferences.contextIsolation).toBe(true);
    expect(opts.webPreferences.nodeIntegration).toBe(false);
    expect(opts.webPreferences.sandbox).toBe(true);
  });
});

