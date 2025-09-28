const { getWindowOptions } = require('../windowOptions');

describe('getWindowOptions', () => {
  it('应该返回正确的窗口尺寸配置', () => {
    const options = getWindowOptions();

    expect(options.width).toBe(1280);
    expect(options.height).toBe(860);
    expect(options.minWidth).toBe(1024);
    expect(options.minHeight).toBe(700);
  });

  it('应该启用安全选项', () => {
    const options = getWindowOptions();

    expect(options.webPreferences.contextIsolation).toBe(true);
    expect(options.webPreferences.nodeIntegration).toBe(false);
    expect(options.webPreferences.sandbox).toBe(true);
  });

  it('应该设置正确的preload路径', () => {
    const options = getWindowOptions();
    const path = require('path');

    expect(options.webPreferences.preload).toBe(
      path.join(process.cwd(), 'src', 'preload.js')
    );
  });
});