/**
 * @jest-environment node
 */

describe('preload electronAPI', () => {
  const exposeInMainWorld = jest.fn()
  const invoke = jest.fn()
  const on = jest.fn()
  const removeListener = jest.fn()

  beforeEach(() => {
    jest.resetModules()
    exposeInMainWorld.mockReset()
    invoke.mockReset()
    on.mockReset()
    removeListener.mockReset()

    jest.doMock('electron', () => ({
      contextBridge: { exposeInMainWorld },
      ipcRenderer: { invoke, on, removeListener }
    }))

    require('../../preload')
  })

  it('应当通过 contextBridge 暴露 electronAPI', () => {
    expect(exposeInMainWorld).toHaveBeenCalledTimes(1)
    const [key, api] = exposeInMainWorld.mock.calls[0]
    expect(key).toBe('electronAPI')
    expect(typeof api).toBe('object')

    expect(typeof api.selectDirectory).toBe('function')
    expect(typeof api.readFile).toBe('function')
    expect(typeof api.writeFile).toBe('function')
    expect(typeof api.watchDirectory).toBe('function')
    expect(typeof api.stopWatching).toBe('function')
    expect(typeof api.searchFiles).toBe('function')
    expect(typeof api.onFileChanged).toBe('function')
    expect(typeof api.offFileChanged).toBe('function')
    expect(typeof api.removeFileChangedListener).toBe('function')
  })

  it('应当将调用转发到 ipcRenderer.invoke/on/removeListener', async () => {
    const [, api] = exposeInMainWorld.mock.calls[0]

    await api.selectDirectory()
    expect(invoke).toHaveBeenCalledWith('select-directory')

    await api.readFile('/a.txt')
    expect(invoke).toHaveBeenCalledWith('read-file', '/a.txt')

    await api.writeFile('/b.txt', 'x')
    expect(invoke).toHaveBeenCalledWith('write-file', '/b.txt', 'x')

    await api.watchDirectory('/root')
    expect(invoke).toHaveBeenCalledWith('watch-directory', '/root')

    await api.stopWatching()
    expect(invoke).toHaveBeenCalledWith('stop-watching')

    await api.searchFiles('App')
    expect(invoke).toHaveBeenCalledWith('search-files', 'App')

    const cb = () => {}
    api.onFileChanged(cb)
    expect(on).toHaveBeenCalledWith('file-changed', cb)

    api.offFileChanged(cb)
    expect(removeListener).toHaveBeenCalledWith('file-changed', cb)

    api.removeFileChangedListener(cb)
    expect(removeListener).toHaveBeenCalledWith('file-changed', cb)
  })
})

