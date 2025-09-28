;(function(){
  let state = { currentPath: '', entries: [] }

  function renderTree() {
    const root = document.getElementById('file-tree')
    if (!root) return
    root.innerHTML = ''
    const list = document.createElement('div')
    state.entries.forEach(file => {
      const row = document.createElement('div')
      row.className = 'file-row'
      row.textContent = file.name
      row.addEventListener('contextmenu', (e) => onContextMenu(e, file))
      list.appendChild(row)
    })
    root.appendChild(list)
  }

  function attachToolbar() {
    const btnOpen = document.getElementById('btn-open')
    const btnRefresh = document.getElementById('btn-refresh')
    const btnNew = document.getElementById('btn-new')
    if (!btnOpen || !btnRefresh || !btnNew) return

    btnOpen.addEventListener('click', async () => {
      const res = await window.electronAPI?.selectDirectory?.()
      if (Array.isArray(res)) return
      state.currentPath = res.rootPath
      state.entries = res.entries
      renderTree()
      startWatcher()
    })

    btnRefresh.addEventListener('click', async () => {
      if (!state.currentPath) return
      const list = await window.electronAPI?.readDirectory?.(state.currentPath)
      if (Array.isArray(list)) {
        state.entries = list
        renderTree()
      }
    })

    btnNew.addEventListener('click', async () => {
      if (!state.currentPath) return
      const name = window.prompt('新建文件夹名称：')
      if (!name) return
      await window.electronAPI?.createFolder?.(`${state.currentPath}/${name}`)
      const list = await window.electronAPI?.readDirectory?.(state.currentPath)
      state.entries = list || []
      renderTree()
    })
  }

  function onContextMenu(e, file) {
    e.preventDefault()
    removeMenu()
    const menu = document.createElement('div')
    menu.className = 'context-menu'
    menu.style.position = 'fixed'
    menu.style.left = `${e.clientX}px`
    menu.style.top = `${e.clientY}px`
    const rename = document.createElement('div')
    rename.className = 'menu-item rename'
    rename.textContent = '重命名'
    rename.addEventListener('click', async () => {
      const name = window.prompt('新名称：', file.name)
      if (name) {
        await window.electronAPI?.renamePath?.(file.path, name)
      }
      removeMenu()
    })
    const del = document.createElement('div')
    del.className = 'menu-item delete'
    del.textContent = '删除'
    del.addEventListener('click', async () => {
      if (window.confirm(`确认删除 ${file.name} ?`)) {
        await window.electronAPI?.deletePath?.(file.path)
      }
      removeMenu()
    })
    menu.appendChild(rename)
    menu.appendChild(del)
    document.body.appendChild(menu)
  }

  function removeMenu() {
    const old = document.querySelector('.context-menu')
    if (old) old.remove()
  }

  function startWatcher() {
    if (!state.currentPath || !window.electronAPI?.watchDirectory) return
    window.electronAPI.watchDirectory(state.currentPath)
    const onChanged = async () => {
      const list = await window.electronAPI?.readDirectory?.(state.currentPath)
      state.entries = list || []
      renderTree()
    }
    window.electronAPI.onFileChanged(onChanged)
    window.addEventListener('beforeunload', () => {
      window.electronAPI.removeFileChangedListener(onChanged)
      window.electronAPI.stopWatching?.()
    })
  }

  window.__initRenderer = function initRenderer(){
    attachToolbar()
    renderTree()
  }
})()

