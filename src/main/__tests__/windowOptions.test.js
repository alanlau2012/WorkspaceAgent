const { getWindowOptions } = require('../windowOptions');

describe('windowOptions', () => {
  test('should have correct default window dimensions', () => {
    const options = getWindowOptions();
    
    expect(options.width).toBe(1280);
    expect(options.height).toBe(860);
    expect(options.minWidth).toBe(1024);
    expect(options.minHeight).toBe(700);
  });

  test('should have correct webPreferences', () => {
    const options = getWindowOptions();
    
    expect(options.webPreferences).toEqual({
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: expect.stringContaining('preload.js'),
    });
  });
});