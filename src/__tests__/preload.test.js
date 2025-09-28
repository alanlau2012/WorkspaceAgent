jest.mock('electron', () => {
  return {
    contextBridge: { exposeInMainWorld: jest.fn() },
    ipcRenderer: {
      invoke: jest.fn(async () => 'ok'),
      on: jest.fn(),
      removeListener: jest.fn(),
    },
  }
})

describe('preload exposes electronAPI', () => {
  test('exposes API and forwards to ipcRenderer.invoke/on/removeListener', async () => {
    // reset module registry then load preload which should call exposeInMainWorld
    jest.resetModules()
    require('../preload')
    const electron = require('electron')

    expect(electron.contextBridge.exposeInMainWorld).toHaveBeenCalledTimes(1)
    const [key, api] = electron.contextBridge.exposeInMainWorld.mock.calls[0]
    expect(key).toBe('electronAPI')

    // verify invoke based APIs
    await api.selectDirectory()
    expect(electron.ipcRenderer.invoke).toHaveBeenCalledWith('select-directory')

    await api.readDirectory('C:/data')
    expect(electron.ipcRenderer.invoke).toHaveBeenCalledWith('read-directory', 'C:/data')

    await api.createFolder('C:/new')
    expect(electron.ipcRenderer.invoke).toHaveBeenCalledWith('create-folder', 'C:/new')

    await api.renamePath('C:/old.txt', 'new.txt')
    expect(electron.ipcRenderer.invoke).toHaveBeenCalledWith('rename-path', 'C:/old.txt', 'new.txt')

    await api.deletePath('C:/trash')
    expect(electron.ipcRenderer.invoke).toHaveBeenCalledWith('delete-path', 'C:/trash')

    await api.readFile('C:/a.txt')
    expect(electron.ipcRenderer.invoke).toHaveBeenCalledWith('read-file', 'C:/a.txt')

    await api.writeFile('C:/b.txt', 'hi')
    expect(electron.ipcRenderer.invoke).toHaveBeenCalledWith('write-file', 'C:/b.txt', 'hi')

    await api.watchDirectory('C:/root')
    expect(electron.ipcRenderer.invoke).toHaveBeenCalledWith('watch-directory', 'C:/root')

    await api.stopWatching()
    expect(electron.ipcRenderer.invoke).toHaveBeenCalledWith('stop-watching')

    // verify event APIs
    const cb = () => {}
    api.onFileChanged(cb)
    expect(electron.ipcRenderer.on).toHaveBeenCalledWith('file-changed', cb)

    api.removeFileChangedListener(cb)
    expect(electron.ipcRenderer.removeListener).toHaveBeenCalledWith('file-changed', cb)
  })
})

