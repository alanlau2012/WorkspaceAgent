Workspace 功能完善计划（TDD 驱动）

一、目标与范围
- 实现：
  - 打开真实文件夹（系统对话框选择目录），将目录树加载到左侧 TreeView。
  - 新建文件夹（当前工作区根目录下）。
  - TreeView 展开/折叠文件夹节点。
  - 右键菜单：重命名、删除（删除需二次确认）。
  - 目录文件变更监听，自动刷新（基础版）。
- 不在本次范围：
  - 大型目录的懒加载优化、搜索的真实后端实现（保留现有 mock）。

二、现状分析（关键代码引用）
- App.jsx 按钮未接线：
```25:28:src/App.jsx
              <button className="toolbar-btn">📁 打开</button>
              <button className="toolbar-btn">🔄 刷新</button>
              <button className="toolbar-btn">➕ 新建</button>
```
- FileTree 使用本地状态、已支持点击展开：
```25:41:src/components/FileTree.jsx
  const toggleFolder = (folderPath) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath)
    } else {
      newExpanded.add(folderPath)
    }
    setExpandedFolders(newExpanded)
  }
...
  const handleFileClick = (file) => {
    if (file.type === 'directory') {
      toggleFolder(file.path)
    } else if (onFileSelect) {
      onFileSelect(file)
    }
  }
```
- useFileManager 仍初始化 mock 数据，关键 API 未落地：
```10:21:src/hooks/useFileManager.js
  useEffect(() => {
    const mockFiles = [
      {
        name: 'src',
        type: 'directory',
        path: '/src',
        children: [
```
```59:77:src/hooks/useFileManager.js
  const loadDirectory = useCallback(async (path) => {
    setIsLoading(true)
    setError(null)
    
    try {
      if (window.electronAPI && window.electronAPI.selectDirectory) {
        const result = await window.electronAPI.selectDirectory()
        setFiles(result)
        setCurrentPath(path)
      } else {
        // Mock data for testing - 使用现有的模拟数据
        setCurrentPath(path)
      }
```
- preload 仅暴露部分 API：
```4:15:src/preload.js
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件系统相关API
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  watchDirectory: (directoryPath) => ipcRenderer.invoke('watch-directory', directoryPath),
  stopWatching: () => ipcRenderer.invoke('stop-watching'),
  
  // 监听文件变化事件
  onFileChanged: (callback) => ipcRenderer.on('file-changed', callback),
  removeFileChangedListener: (callback) => ipcRenderer.removeListener('file-changed', callback)
});
```
- 主进程仅有 read-file，未实现 select-directory / write-file 等：
```4:8:src/main/ipcHandlers.js
function registerIpcHandlers() {
  ipcMain.handle('read-file', async (_event, filePath) => {
    return fs.readFile(filePath, 'utf-8')
  })
}
```
- 文件变更监听已实现但未在 main.js 注册：
```5:22:src/main/ipc/fileSystem.js
function registerFileSystemIpc(ipcMain) {
  let watcher = null;

  ipcMain.handle('watch-directory', async (event, dirPath) => {
    if (watcher) {
      await watcher.close();
      watcher = null;
    }
    watcher = chokidar.watch(dirPath, { ignoreInitial: true });
    const send = (evt, p) => {
      event.sender.send('file-changed', { event: evt, path: p });
    };
    watcher.on('add', p => send('add', p));
    watcher.on('change', p => send('change', p));
    watcher.on('unlink', p => send('unlink', p));
    return true;
  });
```

三、架构与数据流
- 新增 FileManagerContext（Provider + Hook）承载 useFileManager 的单例实例，供 App Toolbar 与 FileTree 共享状态与方法。
- 主进程 IPC：
  - select-directory（打开对话框选择目录，返回 { rootPath, entries } 或 entries[] 兼容旧逻辑）
  - read-directory（读取指定目录的 children，用于刷新/懒加载）
  - create-folder（mkdir）
  - rename-path（fs.rename）
  - delete-path（fs.rm recursive）
  - write-file（保留）
  - watch-directory / stop-watching（已存在，main.js 注册）
- preload 暴露对应 API
- useFileManager：
  - 去除 mock 初始化（测试模式下保留），新增：createFolder、deletePath、renamePath、refresh、启动/清理 watcher
  - loadDirectory：支持两种模式
    - path 为空：调起对话框，使用返回的 rootPath 设置 currentPath
    - path 存在：直接以 read-directory 加载

四、API 设计（通道/返回）
- 'select-directory' => { rootPath: string, entries: FileEntry[] } | FileEntry[]（兼容）
- 'read-directory', dirPath => FileEntry[]
- 'create-folder', dirPath => true
- 'rename-path', oldPath, newName => true（主进程内部拼接新路径）
- 'delete-path', targetPath => true
- 'write-file', filePath, content => true
- FileEntry: { name, type: 'file'|'directory', path, children? }

五、TDD 分解
1) 主进程 IPC 单元测试（jest，mock electron.dialog / fs/promises）：
- 新增用例覆盖：select-directory、read-directory、create-folder、rename-path、delete-path、write-file。
- 保持现有 read-file/watch-directory 测试通过。

2) Hook 单元测试（@testing-library/react-hooks）：
- 去除/隔离 mock 初始化；覆盖：loadDirectory（两种模式）、createFolder、renamePath、deletePath、refresh、watch 回调触发后的刷新。

3) 组件测试（@testing-library/react）：
- FileTree：右键菜单显示、重命名交互（prompt）、删除交互（confirm）、展开/折叠。
- App Toolbar：按钮点击触发对应上下文方法（open、refresh、new folder）。

六、实施步骤与具体改动
步骤 0：创建上下文 Provider（使 App 与 FileTree 共享同一 useFileManager 实例）
- 新增文件：src/contexts/FileManagerContext.jsx
```jsx
import React, { createContext, useContext } from 'react'
import { useFileManager } from '../hooks/useFileManager'

const FileManagerContext = createContext(null)
export const FileManagerProvider = ({ children }) => {
  const value = useFileManager()
  return <FileManagerContext.Provider value={value}>{children}</FileManagerContext.Provider>
}
export const useFileManagerCtx = () => useContext(FileManagerContext)
```
- 修改 src/App.jsx：用 Provider 包裹，按钮接线
```jsx
import { FileManagerProvider, useFileManagerCtx } from './contexts/FileManagerContext'

function Toolbar() {
  const { loadDirectory, currentPath, refresh, createFolder } = useFileManagerCtx()
  return (
    <div className="file-tree-toolbar">
      <button className="toolbar-btn" onClick={() => loadDirectory('')}>📁 打开</button>
      <button className="toolbar-btn" onClick={() => refresh()}>🔄 刷新</button>
      <button className="toolbar-btn" onClick={() => {
        const name = window.prompt('新建文件夹名称：')
        if (name) createFolder(`${currentPath}/${name}`)
      }}>➕ 新建</button>
    </div>
  )
}
```
- 修改 src/App.jsx：用 Provider 包裹整个主界面，并在 header 中渲染 <Toolbar />。

步骤 1：主进程 IPC 扩展（测试先行）
- 修改/新增测试：src/main/__tests__/ipcHandlers.fs.test.js（新文件）
  - 覆盖 channels：select-directory、read-directory、create-folder、rename-path、delete-path、write-file
  - mock：electron.dialog.showOpenDialog、fs.promises.readdir/lstat/mkdir/rename/rm/writeFile
- 修改 src/main/ipcHandlers.js：实现上述 handlers（保留 read-file）
```js
const { ipcMain, dialog } = require('electron')
const fs = require('fs/promises')
const path = require('path')

function toEntry(root, name, isDir) {
  const p = path.join(root, name)
  return isDir ? { name, type: 'directory', path: p } : { name, type: 'file', path: p }
}
async function listDir(dir) {
  const names = await fs.readdir(dir, { withFileTypes: true })
  const entries = await Promise.all(names.map(async d => {
    const isDir = d.isDirectory()
    const e = toEntry(dir, d.name, isDir)
    if (isDir) e.children = await listDir(e.path) // 简化：递归全量
    return e
  }))
  return entries
}
function registerIpcHandlers() {
  ipcMain.handle('read-file', async (_e, filePath) => fs.readFile(filePath, 'utf-8'))
  ipcMain.handle('write-file', async (_e, filePath, content) => { await fs.writeFile(filePath, content ?? ''); return true })
  ipcMain.handle('create-folder', async (_e, dirPath) => { await fs.mkdir(dirPath, { recursive: true }); return true })
  ipcMain.handle('rename-path', async (_e, oldPath, newName) => {
    const newPath = path.join(path.dirname(oldPath), newName)
    await fs.rename(oldPath, newPath); return true
  })
  ipcMain.handle('delete-path', async (_e, targetPath) => { await fs.rm(targetPath, { recursive: true, force: true }); return true })
  ipcMain.handle('select-directory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (canceled || !filePaths?.[0]) return []
    const rootPath = filePaths[0]
    const entries = await listDir(rootPath)
    return { rootPath, entries }
  })
  ipcMain.handle('read-directory', async (_e, dirPath) => listDir(dirPath))
}
module.exports = { registerIpcHandlers }
```
- 修改 src/main.js：注册文件系统 watcher（保持现有功能）
```js
const { registerFileSystemIpc } = require('./main/ipc/fileSystem')
...
app.whenReady().then(() => {
  registerIpcHandlers();
  registerFileSystemIpc(require('electron').ipcMain);
  createWindow();
})
```

步骤 2：preload 暴露新 API（测试可通过 window.electronAPI mock）
- 修改 src/preload.js：
```js
contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  createFolder: (dirPath) => ipcRenderer.invoke('create-folder', dirPath),
  renamePath: (oldPath, newName) => ipcRenderer.invoke('rename-path', oldPath, newName),
  deletePath: (targetPath) => ipcRenderer.invoke('delete-path', targetPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  watchDirectory: (directoryPath) => ipcRenderer.invoke('watch-directory', directoryPath),
  stopWatching: () => ipcRenderer.invoke('stop-watching'),
  onFileChanged: (callback) => ipcRenderer.on('file-changed', callback),
  removeFileChangedListener: (callback) => ipcRenderer.removeListener('file-changed', callback)
})
```

步骤 3：useFileManager 强化（移除默认 mock，新增 API 调用与 watcher）
- 修改 src/hooks/useFileManager.js：
  - 初始化：不再默认 setFiles(mock)，仅在无 electronAPI 时保留 mock（用于 Jest 环境）。
  - 新增方法：createFolder、deletePath、renamePath、refresh。
  - loadDirectory：
    - 若 path 为空：使用 selectDirectory，兼容 { rootPath, entries } 或数组；设置 currentPath。
    - 若 path 存在：调用 readDirectory 直接加载。
  - 监听 onFileChanged：触发 refresh 节流刷新（避免频繁）。
- 示例要点（片段）：
```js
const refresh = useCallback(async () => {
  if (!currentPath) return
  if (window.electronAPI?.readDirectory) {
    const list = await window.electronAPI.readDirectory(currentPath)
    setFiles(list)
  }
}, [currentPath])

const createFolder = useCallback(async (dirPath) => {
  await window.electronAPI?.createFolder?.(dirPath)
  await refresh()
}, [refresh])

const deletePath = useCallback(async (p) => {
  await window.electronAPI?.deletePath?.(p)
  await refresh()
}, [refresh])

const renamePath = useCallback(async (oldPath, newName) => {
  await window.electronAPI?.renamePath?.(oldPath, newName)
  await refresh()
}, [refresh])

useEffect(() => {
  if (!currentPath || !window.electronAPI?.watchDirectory) return
  window.electronAPI.watchDirectory(currentPath)
  const handler = () => refresh()
  window.electronAPI.onFileChanged(handler)
  return () => {
    window.electronAPI.removeFileChangedListener(handler)
    window.electronAPI.stopWatching?.()
  }
}, [currentPath, refresh])
```
- 兼容旧方法名：保留 createFile/deleteFile/renameFile，分别代理到新实现（或保留以免现有测试失败）。

步骤 4：FileTree 支持右键菜单（重命名/删除）
- 修改 src/components/FileTree.jsx：
  - 改为使用 useFileManagerCtx（从 Context 获取）
  - 为每个 .file-row 增加 onContextMenu，弹出自定义菜单。
  - 菜单项：重命名（prompt 输入新名称，调用 renamePath）、删除（confirm 确认，调用 deletePath）。
  - 保持点击展开/收起逻辑。
- 示例片段：
```jsx
const { renamePath, deletePath } = useFileManagerCtx()
const [menu, setMenu] = useState({ visible:false, x:0, y:0, target:null })

const onContext = (e, file) => {
  e.preventDefault(); setMenu({ visible:true, x:e.clientX, y:e.clientY, target:file })
}
...
<div className={`file-row ...`} onClick={() => handleFileClick(file)} onContextMenu={(e)=>onContext(e,file)}>
...
{menu.visible && (
  <div className="context-menu" style={{ left:menu.x, top:menu.y }} onMouseLeave={()=>setMenu(v=>({...v,visible:false}))}>
    <div className="menu-item" onClick={()=>{ const name = prompt('新名称：', menu.target.name); if(name){ renamePath(menu.target.path, name) } setMenu(v=>(({...v,visible:false})) }}>重命名</div>
    <div className="menu-item danger" onClick={()=>{ if(confirm(`确认删除 ${menu.target.name} ?`)) deletePath(menu.target.path); setMenu(v=>(({...v,visible:false})) }}>删除</div>
  </div>
)}
```
- 修改样式 src/components/FileTree.css：新增 .context-menu/.menu-item/.danger 基础样式。

步骤 5：App Toolbar 接线
- 修改 src/App.jsx：
  - 将 FileTree 包装在 Provider 内；
  - 引入 Toolbar 组件（步骤 0 示例）；
  - FileTree 继续通过 Context 使用统一的 useFileManager 状态。

步骤 6：测试用例编写与更新
- 主进程：新增 src/main/__tests__/ipcHandlers.fs.test.js，覆盖所有新通道；确保现有 ipcHandlers.test.js 仍通过。
- Hook：更新 src/hooks/__tests__/useFileManager.test.js
  - 新增：createFolder/renamePath/deletePath/refresh/watch 流程
  - 在无 electronAPI 情况下保留 mock 数据断言；在存在 electronAPI mock 时走真实分支。
- 组件：
  - 更新 src/components/__tests__/FileTree.test.jsx 以 Context 包裹被测组件（或 mock useFileManagerCtx）。
  - 新增右键菜单交互测试：
    - 触发 contextmenu → 显示菜单
    - mock prompt/confirm → 调用 renamePath/deletePath
  - 新增 App Toolbar 测试：点击按钮触发对应 ctx 方法。

七、依赖与实施顺序
1) 步骤 1（主进程 IPC + 测试）
2) 步骤 2（preload）
3) 步骤 3（useFileManager + 测试）
4) 步骤 0 & 5（Context Provider + App 接线 + 测试）
5) 步骤 4（FileTree 右键菜单 + 样式 + 测试）
- 每步遵循：先写/更新测试 → 最小实现 → 重构。

八、边界与考虑
- 对话框取消：select-directory 返回 []，不改变 currentPath。
- 大目录遍历：初版递归全量，风险：性能；建议后续：限定深度 + 懒加载 read-directory。
- 符号链接与循环：fs.readdir withFileTypes 无法直接识别循环；后续加入 inode/visited 集合防止无限递归。
- 权限错误：捕获 fs 异常，渲染进程 setError 展示；操作失败不刷新列表。
- Windows/WSL 路径：主进程统一使用 path.join/path.dirname；渲染层不拼接绝对路径（交由主进程 rename-path 处理）。
- 删除确认：必须 window.confirm；失败时提示错误。
- 监听抖动：对 file-changed 合并/节流 300ms 后 refresh。

九、具体文件清单
- 新增：
  - src/contexts/FileManagerContext.jsx
  - src/main/__tests__/ipcHandlers.fs.test.js
- 修改：
  - src/main/ipcHandlers.js（新增 handlers）
  - src/main.js（注册 registerFileSystemIpc）
  - src/preload.js（暴露新 API）
  - src/hooks/useFileManager.js（新增方法、移除默认 mock、监听 watcher）
  - src/components/FileTree.jsx（使用 Context；右键菜单）
  - src/components/FileTree.css（右键菜单样式）
  - src/App.jsx（Provider 包裹 + Toolbar 接线）
  - 测试：src/hooks/__tests__/useFileManager.test.js、src/components/__tests__/FileTree.test.jsx（相应调整/新增用例）

十、验收标准（DoD）
- 单元/集成测试全部通过，覆盖：
  - 主进程 IPC 新增通道 100% 分支覆盖
  - useFileManager 关键路径（open/refresh/create/rename/delete/watch）
  - FileTree 右键菜单交互
  - App Toolbar 按钮交互
- 手动验证：
  - 打开真实目录可见文件树
  - 新建文件夹立即可见
  - 右键重命名与删除（删除需确认）生效
  - 在外部改动文件/文件夹，应用能自动刷新

十一、后续优化（非本次必做）
- 懒加载与虚拟化渲染
- 路径收藏与最近工作区
- 批量操作、多选
- 搜索服务端/主进程实现

实施备注
- 严格执行 TDD：每步先写测试再实现。
- 提交粒度：每个子功能一个 commit，附带通过的测试。
