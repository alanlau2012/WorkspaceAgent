jest.mock('chokidar', () => ({
  watch: jest.fn(() => {
    const handlers = {};
    return {
      on: jest.fn((evt, cb) => { handlers[evt] = cb; return this; }),
      __emit: (evt, path) => { if (handlers[evt]) handlers[evt](path); },
      close: jest.fn(async () => {}),
      __handlers: handlers,
    };
  })
}));

const chokidar = require('chokidar');
const { registerFileSystemIpc } = require('../ipc/fileSystem');

function createIpcMock() {
  const handlers = new Map();
  return {
    handle: (channel, fn) => handlers.set(channel, fn),
    invoke: async (channel, ...args) => {
      const fn = handlers.get(channel);
      const event = { sender: { send: jest.fn(), id: 'w1' } };
      const res = await fn(event, ...args);
      return { res, event };
    },
  };
}

describe('fileSystem IPC - watch-directory', () => {
  test('watch-directory 启动并转发事件，stop-watching 停止', async () => {
    const ipcMain = createIpcMock();
    registerFileSystemIpc(ipcMain);

    const { event } = await ipcMain.invoke('watch-directory', '/tmp/demo');
    expect(chokidar.watch).toHaveBeenCalled();

    // 取得最近创建的 watcher 并模拟事件
    const mockWatcher = chokidar.watch.mock.results[0].value;
    mockWatcher.__emit('add', '/tmp/demo/a.txt');
    mockWatcher.__emit('change', '/tmp/demo/b.txt');
    mockWatcher.__emit('unlink', '/tmp/demo/c.txt');

    const sends = event.sender.send.mock.calls.filter(c => c[0] === 'file-changed');
    expect(sends.length).toBeGreaterThanOrEqual(3);
    expect(sends[0][1]).toMatchObject({ event: 'add' });

    await ipcMain.invoke('stop-watching');
    expect(mockWatcher.close).toHaveBeenCalled();
  });
});

