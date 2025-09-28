import userEvent from '@testing-library/user-event'

describe('renderer DOM UI (Toolbar + FileTree + Context Menu)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="file-tree-toolbar">
        <button id="btn-open">📁 打开</button>
        <button id="btn-refresh">🔄 刷新</button>
        <button id="btn-new">➕ 新建</button>
      </div>
      <div id="file-tree"></div>
    `
    window.prompt = jest.fn()
    window.confirm = jest.fn(() => true)
    window.electronAPI = {
      selectDirectory: jest.fn(),
      readDirectory: jest.fn(),
      createFolder: jest.fn(),
      renamePath: jest.fn(),
      deletePath: jest.fn(),
      watchDirectory: jest.fn(),
      onFileChanged: jest.fn(),
      removeFileChangedListener: jest.fn(),
      stopWatching: jest.fn(),
    }
    jest.resetModules()
    require('../renderer')
    window.__initRenderer()
  })

  test('Open button loads directory and renders entries', async () => {
    const entries = [
      { name: 'sub', type: 'directory', path: 'C:/root/sub', children: [] },
      { name: 'a.txt', type: 'file', path: 'C:/root/a.txt' }
    ]
    window.electronAPI.selectDirectory.mockResolvedValue({ rootPath: 'C:/root', entries })

    await userEvent.click(document.getElementById('btn-open'))

    const tree = document.getElementById('file-tree')
    expect(tree.textContent).toContain('sub')
    expect(tree.textContent).toContain('a.txt')
  })

  test('Refresh button calls readDirectory for currentPath', async () => {
    const entries = [{ name: 'x', type: 'file', path: 'C:/root/x' }]
    window.electronAPI.selectDirectory.mockResolvedValue({ rootPath: 'C:/root', entries })
    await userEvent.click(document.getElementById('btn-open'))

    window.electronAPI.readDirectory.mockResolvedValue(entries)
    await userEvent.click(document.getElementById('btn-refresh'))
    expect(window.electronAPI.readDirectory).toHaveBeenCalledWith('C:/root')
  })

  test('New button prompts and creates folder then refreshes', async () => {
    const entries = []
    window.electronAPI.selectDirectory.mockResolvedValue({ rootPath: 'C:/root', entries })
    await userEvent.click(document.getElementById('btn-open'))

    window.prompt.mockReturnValue('newdir')
    window.electronAPI.readDirectory.mockResolvedValue(entries)
    await userEvent.click(document.getElementById('btn-new'))
    expect(window.electronAPI.createFolder).toHaveBeenCalledWith('C:/root/newdir')
    expect(window.electronAPI.readDirectory).toHaveBeenCalledWith('C:/root')
  })

  test('Right-click shows menu and triggers rename/delete', async () => {
    const entries = [{ name: 'a.txt', type: 'file', path: 'C:/root/a.txt' }]
    window.electronAPI.selectDirectory.mockResolvedValue({ rootPath: 'C:/root', entries })
    await userEvent.click(document.getElementById('btn-open'))

    const row = Array.from(document.querySelectorAll('.file-row')).find(el => el.textContent.includes('a.txt'))
    const evt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 })
    row.dispatchEvent(evt)

    const menu = document.querySelector('.context-menu')
    expect(menu).toBeTruthy()
    window.prompt.mockReturnValue('b.txt')
    await userEvent.click(menu.querySelector('.menu-item.rename'))
    expect(window.electronAPI.renamePath).toHaveBeenCalledWith('C:/root/a.txt', 'b.txt')

    await userEvent.click(menu.querySelector('.menu-item.delete'))
    expect(window.electronAPI.deletePath).toHaveBeenCalledWith('C:/root/a.txt')
  })
})

