const { handleUserMessage } = require('../agent');

function createDeps() {
  const contextManager = {
    getContextBundle: jest.fn(() => ({ totalBytes: 0, files: [] })),
  };
  const llmClient = {
    sendMessage: jest.fn(async ({ messages }) => `echo:${messages[0].content}`),
  };
  const electronAPI = {
    readFile: jest.fn(async (p) => `file-content-of:${p}`),
    renameFile: jest.fn(async () => {}),
  };
  return { contextManager, llmClient, electronAPI };
}

describe('agent.handleUserMessage', () => {
  test('执行 read 命令', async () => {
    const deps = createDeps();
    const res = await handleUserMessage('read /a.txt', deps);
    expect(deps.electronAPI.readFile).toHaveBeenCalledWith('/a.txt');
    expect(res).toContain('file-content-of:/a.txt');
  });

  test('执行 rename 命令', async () => {
    const deps = createDeps();
    const res = await handleUserMessage('rename /a.txt to b.txt', deps);
    expect(deps.electronAPI.renameFile).toHaveBeenCalledWith({ oldPath: '/a.txt', newName: 'b.txt' });
    expect(res).toContain('已重命名');
  });

  test('默认走 llmClient，携带上下文', async () => {
    const deps = createDeps();
    deps.contextManager.getContextBundle.mockReturnValue({ totalBytes: 1, files: [{ path: '/x', bytes: 1 }] });
    const res = await handleUserMessage('hello', deps);
    expect(deps.llmClient.sendMessage).toHaveBeenCalled();
    expect(res).toBe('echo:hello');
  });
});

