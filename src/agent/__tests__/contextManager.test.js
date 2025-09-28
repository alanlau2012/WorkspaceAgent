const { createContextManager } = require('../contextManager');

describe('contextManager', () => {
  test('add/remove/clear 与打包限制', () => {
    const cm = createContextManager({ maxTotalBytes: 50 });
    cm.addFile('/a.txt', 'hello'); // 5 bytes
    cm.addFile('/b.txt', 'world!!!'); // 8 bytes
    let bundle = cm.getContextBundle();
    expect(bundle.totalBytes).toBeGreaterThan(0);
    expect(bundle.files.find(f => f.path === '/a.txt')).toBeTruthy();

    cm.removeFile('/a.txt');
    bundle = cm.getContextBundle();
    expect(bundle.files.find(f => f.path === '/a.txt')).toBeFalsy();

    cm.clear();
    bundle = cm.getContextBundle();
    expect(bundle.totalBytes).toBe(0);
    expect(bundle.files.length).toBe(0);
  });

  test('超过上限时应根据大小挑选文件', () => {
    const cm = createContextManager({ maxTotalBytes: 10 });
    cm.addFile('/small.txt', '123'); // 3
    cm.addFile('/medium.txt', '12345'); // 5
    cm.addFile('/large.txt', '1234567890'); // 10
    const bundle = cm.getContextBundle();
    // 大文件等于上限，应该被单独选中或小+中组合，视排序而定
    const pickedNames = bundle.files.map(f => f.path);
    expect(bundle.totalBytes).toBeLessThanOrEqual(10);
    expect(pickedNames.length).toBeGreaterThan(0);
  });

  test('敏感字段应被简单脱敏', () => {
    const cm = createContextManager({ maxTotalBytes: 100 });
    cm.addFile('/secret.txt', 'const API_KEY = "xxx"; const token = "yyy";');
    const { files } = cm.getContextBundle();
    const preview = files.find(f => f.path === '/secret.txt').preview;
    expect(preview).not.toMatch(/API_KEY|token/);
    expect(preview).toMatch(/\[REDACTED\]/);
  });
});

