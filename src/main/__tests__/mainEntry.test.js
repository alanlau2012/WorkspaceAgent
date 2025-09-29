/**
 * @jest-environment node
 */

const mockWhenReady = jest.fn(() => Promise.resolve())
const mockOn = jest.fn()
const mockRegisterIpcHandlers = jest.fn()
const mockRegisterFileSystemIpc = jest.fn()

beforeEach(() => {
  jest.resetModules()
  jest.clearAllMocks()

  jest.doMock('electron', () => {
    const browserWindowInstance = {
      loadURL: jest.fn(),
      loadFile: jest.fn(),
      webContents: {
        openDevTools: jest.fn()
      }
    }

    const BrowserWindow = jest.fn(() => browserWindowInstance)
    BrowserWindow.getAllWindows = jest.fn(() => [])

    return {
      app: {
        whenReady: mockWhenReady,
        on: mockOn
      },
      BrowserWindow,
      ipcMain: {}
    }
  })

  jest.doMock('../ipcHandlers', () => ({
    registerIpcHandlers: mockRegisterIpcHandlers
  }))

  jest.doMock('../ipc/fileSystem', () => ({
    registerFileSystemIpc: mockRegisterFileSystemIpc
  }))
})

describe('应用主进程入口 main.js', () => {
  it('应该能够被安全地加载', () => {
    expect(() => require('../../main')).not.toThrow()
    expect(mockWhenReady).toHaveBeenCalled()
  })
})
