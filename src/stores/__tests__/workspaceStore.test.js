const { createWorkspaceStore } = require('../workspaceStore');

describe('workspaceStore', () => {
  test('初始化与根路径设置', () => {
    const store = createWorkspaceStore({ currentRoot: '/root' });
    expect(store.getState().currentRoot).toBe('/root');
    store.setRoot('/new');
    expect(store.getState().currentRoot).toBe('/new');
  });

  test('选中文件的增删清空', () => {
    const store = createWorkspaceStore();
    store.addSelected('/a');
    store.addSelected('/b');
    expect(store.getState().selectedFiles.has('/a')).toBe(true);
    store.removeSelected('/a');
    expect(store.getState().selectedFiles.has('/a')).toBe(false);
    store.clearSelected();
    expect(store.getState().selectedFiles.size).toBe(0);
  });
});

