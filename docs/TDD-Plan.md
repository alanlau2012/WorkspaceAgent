# WorkspaceAgent MVP 实施计划（TDD驱动）

> 目标：交付一个包含文件管理、文件预览与聊天面板的 Electron 桌面应用，并以 TDD 驱动全流程（主进程/Preload/渲染层），覆盖单元、组件、集成与基础 E2E 测试。并在 MVP 阶段实现基础 Agent 能力（基于上下文的简单文件操作）。

---

## 目标与范围

- 左中右三栏布局：
  1. 左侧：Workspace 文件管理器（TreeView + 基本文件操作）
  2. 中间：文件预览（代码/文本/图片）
  3. 右侧：AI 聊天面板（可选模型）
- 后台 Agent 可纳入选中文件上下文，在聊天中执行简单文件操作。
- 全程严格 TDD：先写失败测试，再最小实现，最后重构。主进程/Preload/渲染进程均有测试覆盖（单元 + 集成 + 基础 E2E）。

---

## 现状诊断（代码证据）

- 主进程未接入 preload，也未区分 dev/prod 加载：

```1:14:src/main.js
const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('src/index.html');
}
```

- Preload 已暴露部分文件 API，但主进程未实现对应 IPC handler：

```1:15:src/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
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

- App 只包含左侧 Tree 和中间预览，缺少右侧聊天：

```16:29:src/App.jsx
  return (
    <div className="App">
      <Layout style={{ height: '100vh' }}>
        <Sider width={300} style={{ background: '#fff' }}>
          <FileTree 
            onFileSelect={handleFileSelect}
            showSearch={true}
          />
        </Sider>
        <Content style={{ padding: '16px' }}>
          <FilePreview file={selectedFile} />
        </Content>
      </Layout>
    </div>
  )
```

- `useFileManager` 使用 mock 初始化，未接入真实 API：

```10:12:src/hooks/useFileManager.js
  // 初始化时加载模拟数据
  useEffect(() => {
    const mockFiles = [
```

- Jest 配置键名错误（应为 `moduleNameMapper`）：

```1:9:jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapping: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
```

- FilePreview 测试与实现 API 不一致（测试用 `window.electron`，代码用 `window.electronAPI`）：

```12:15:src/components/__tests__/FilePreview.test.jsx
Object.defineProperty(window, 'electron', {
  value: mockElectron,
  writable: true
})
```

```49:52:src/components/FilePreview.jsx
        if (window.electronAPI && window.electronAPI.readFile) {
          const fileContent = await window.electronAPI.readFile(file.path)
          setContent(fileContent)
        } else {
```

---

## 总体架构与 TDD 策略

- 主进程最小化：文件系统与 watch 封装为 IPC 模块；路径验证安全；Preload 仅桥接安全 API。
- 渲染进程：业务逻辑在 Hook 和 Store 中，便于单测；组件以可测试方式组合。
- Agent：Renderer 侧实现（便于单测），通过 `electronAPI` 读取文件并调用 LLM 客户端（初期 mock）。
- 测试分层：
  - 单元：fsTree 构建、IPC 参数校验、preload 桥接、hook/store、Agent 与 llmClient。
  - 组件：FileTree、FilePreview、ChatPanel。
  - 集成：IPC watch 事件到 hook 刷新。
  - E2E（冒烟）：打开目录 → 预览 → 聊天回声。

---

## 分阶段实施步骤（每步遵循“红-绿-重构”）

### Phase 0 — 工具链与运行基线

#### 0.1 修正 Jest 配置
- 修改 `jest.config.js`：将 `moduleNameMapping` 改为 `moduleNameMapper`；确认 CSS 映射生效。

#### 0.2 主进程加载策略（dev/prod）
- 修改 `src/main.js`：
  - `webPreferences.preload = path.resolve(__dirname, 'preload.js')`
  - dev：`loadURL('http://localhost:3000')`；prod：`loadFile('dist/index.html')`
  - 可抽取 `resolveIndexUrl` 到 `src/main/utils.js`，并编写单测。

#### 0.3 移除对 `src/index.html` 的直接加载（转为 Vite 入口）
- 保留根目录 `index.html` 作为 Vite 入口；生产使用 `dist/index.html`。

---

### Phase 1 — 文件系统 IPC 与 Preload 桥接

#### 1.1 设计 IPC 通道
- `select-directory` → 返回目录树
- `read-file(path)` → 文本/图片（图片返回 dataURL）
- `write-file(path, content)`
- `create-file(path)`
- `delete-file(path)`
- `rename-file({ oldPath, newName })`
- `search-files(query[, opts])` → 名称模糊搜索
- `watch-directory(path)`
- `stop-watching()`
- 事件：`file-changed { event, path }`

#### 1.2 目录树构建纯函数（可单测）
- 新建 `src/shared/fsTree.js`：`buildFSTree(rootPath, { depthLimit?, followSymlinks?=false, ignoreGlobs? })` → 返回 `{ name, type, path, children? }[]`
- 单测：嵌套目录/符号链接循环忽略/权限错误跳过/隐藏文件过滤。

#### 1.3 主进程 IPC 实现
- 新建 `src/main/ipc/fileSystem.js`：`registerFileSystemIpc(ipcMain, dialog, BrowserWindow)`
  - 使用 `fs/promises`、`path` 与 `fsTree`；针对每个窗口维护 `allowedRoot`；所有操作做路径归一与越权校验（`startsWith(allowedRoot)`）。
  - 集成 `chokidar`，按窗口维度维护 watcher，事件节流后通过 `webContents.send('file-changed', payload)`。
- 单测：mock `fs`、`dialog.showOpenDialog`、`chokidar`、`webContents`；校验路径校验、调用参数与事件格式。

#### 1.4 扩展 Preload API
- 修改 `src/preload.js`，补充：`createFile`、`deleteFile`、`renameFile`、`searchFiles` 导出；确保 `on/off` 文件变化监听存在。
- 单测：mock `electron.ipcRenderer`，验证 `exposeInMainWorld` 的键与 `invoke/on/removeListener` 调用通道名。

---

### Phase 2 — 重构 `useFileManager`（接入真实 API）与修复现有测试

#### 2.1 Hook 实现
- 去掉挂载时 mock 初始化；新增 `loadDirectory()` 触发 `selectDirectory` 并设置 `files/currentPath`；
- `create/delete/rename` 均调用对应 API 后刷新当前目录；`searchFiles` 支持 fallback 为前端过滤；
- 订阅 `onFileChanged` → 简化处理为整体刷新（MVP）。

#### 2.2 修复与完善单测
- 更新 `src/hooks/__tests__/useFileManager.test.js`：统一 mock `window.electronAPI`（`selectDirectory/readFile/writeFile/createFile/deleteFile/renameFile/searchFiles/watchDirectory/stopWatching/onFileChanged`）。
- 断言状态迁移、API 入参与错误处理。

---

### Phase 3 — FileTree 增强（工具栏 + 交互）

#### 3.1 UI 增强
- `FileTree.jsx` 加入工具栏：打开文件夹、刷新、新建文件、重命名、删除；保留搜索框。
- 点击文件 → `onFileSelect`；点击目录 → 展开/折叠。

#### 3.2 单测
- 扩展 `src/components/__tests__/FileTree.test.jsx`：校验工具栏按钮调用对应 hook 方法；展开折叠与选择行为。

---

### Phase 4 — FilePreview 可靠性与测试对齐

#### 4.1 组件改造
- 一律使用 `window.electronAPI.readFile`；
- 处理大文件上限（如 1MB）提示；支持图片 dataURL；不支持类型给出提示。

#### 4.2 测试修复
- 修改 `src/components/__tests__/FilePreview.test.jsx`：mock `window.electronAPI.readFile`；沿用现有场景（文本/图片/代码/不支持/错误/加载）。

---

### Phase 5 — 聊天面板与模型选择（渲染层）

#### 5.1 组件与状态
- 新建：
  - `src/components/Chat/ChatPanel.jsx`（消息列表 + 输入框 + 模型选择）
  - `src/components/Chat/ChatMessage.jsx`
  - `src/stores/chatStore.js`（Zustand：`messages`、`selectedModel`、`isStreaming`）

#### 5.2 LLM 客户端抽象
- 新建 `src/services/llmClient.js`：`sendMessage({ model, messages, context? })`；提供 mock provider（回声/固定回复）。

#### 5.3 单测
- `src/components/Chat/__tests__/ChatPanel.test.jsx`：渲染组件、发送消息 → 产生用户消息与 mock 回复；模型切换生效。
- `src/services/__tests__/llmClient.test.js`：provider 选择与基本调用。

#### 5.4 布局整合
- 修改 `src/App.jsx`：三栏布局（左：Tree；中：Preview；右：Chat）。

---

### Phase 6 — Agent 上下文管理与编排

#### 6.1 上下文管理器
- 新建 `src/agent/contextManager.js`：维护纳入上下文的文件（路径 + 内容摘要）；提供 `getContextBundle()`（限制大小 + 屏蔽敏感模式如 token）。

#### 6.2 工作区 Store
- 新建 `src/stores/workspaceStore.js`：`currentRoot`、`selectedFiles(Set)` 与增删改；FileTree 支持“加入上下文”的 UI（复选框或图标）。

#### 6.3 Agent 编排器
- 新建 `src/agent/agent.js`：`handleUserMessage(input, { contextManager, llmClient, electronAPI })`
  - MVP 命令：
    - `read <path>` → 读取文件并回复
    - `rename <old> to <new>` → 调用 `rename-file`
    - 否则 → 携带 `contextBundle` 调用 `llmClient`

#### 6.4 单测
- `src/agent/__tests__/contextManager.test.js`：增删/打包/截断
- `src/agent/__tests__/agent.test.js`：命令解析与调用验证

---

### Phase 7 — 目录监听集成

#### 7.1 主进程 `watch-directory` 完善
- `select-directory` 后自动启动 watch；事件节流与去抖；统一事件格式。

#### 7.2 渲染层订阅
- Hook 订阅 `onFileChanged` 并刷新。

#### 7.3 测试
- IPC 侧：模拟 `chokidar` 事件 → 发送 `file-changed`
- Hook 侧：模拟 `onFileChanged` 回调 → 断言刷新被调用

---

### Phase 8 — E2E 冒烟（Playwright for Electron）

#### 8.1 工具与脚本
- 新增 `@playwright/test` 配置与 Electron 启动脚本。

#### 8.2 场景
- 启动 → 打开临时目录 → 树中出现文件 → 点击预览 → 聊天发送并收到 mock 回复。

---

### Phase 9 — 最低限度安全加固

- `BrowserWindow`：`contextIsolation: true`、`nodeIntegration: false`、禁用 `remote`、`sandbox: true`（兼容性验证）。
- 主进程路径校验防越权；
- `index.html` 添加 CSP（允许 `img data:`）；
- 单测覆盖路径穿越拒绝用例。

---

### Phase 10 — 文档

- 新增 `docs/Architecture.md`：模块边界、IPC API、数据流与安全模型。
- 新增 `docs/TDD-Plan.md`：测试用例矩阵与执行指南。
- 更新 `README`：开发/构建/测试指引。

---

## 具体文件改动清单

- 修改
  - `src/main.js`（preload 接入；dev/prod 加载；注册 IPC）
  - `src/preload.js`（补齐 `createFile/deleteFile/renameFile/searchFiles`；监听 API）
  - `src/hooks/useFileManager.js`（移除 mock；接入 `electronAPI`；watch 事件刷新）
  - `src/components/FileTree.jsx`（工具栏与操作）
  - `src/components/FilePreview.jsx`（统一 `electronAPI`；大文件提示）
  - `src/components/__tests__/FilePreview.test.jsx`（mock `electronAPI`）
  - `src/hooks/__tests__/useFileManager.test.js`（mock `electronAPI`）
  - `src/components/__tests__/FileTree.test.jsx`（工具栏测试）
  - `src/App.jsx`（三栏布局集成 ChatPanel）
  - `jest.config.js`（`moduleNameMapper` 修正）
  - `index.html`（添加 CSP）
  - `package.json`（后续加入 `test:e2e` 脚本）

- 新增
  - `src/shared/fsTree.js`
  - `src/shared/__tests__/fsTree.test.js`
  - `src/main/ipc/fileSystem.js`
  - `src/main/__tests__/ipc-fileSystem.test.js`
  - `src/main/utils.js`（可选）
  - `src/main/__tests__/utils.test.js`（可选）
  - `src/components/Chat/ChatPanel.jsx`
  - `src/components/Chat/ChatMessage.jsx`
  - `src/components/Chat/__tests__/ChatPanel.test.jsx`
  - `src/services/llmClient.js`
  - `src/services/__tests__/llmClient.test.js`
  - `src/stores/chatStore.js`
  - `src/stores/workspaceStore.js`
  - `src/agent/contextManager.js`
  - `src/agent/__tests__/contextManager.test.js`
  - `src/agent/agent.js`
  - `src/agent/__tests__/agent.test.js`
  - `e2e/electron.spec.ts`（或 `.js`）与相关启动脚本
  - `docs/Architecture.md`，`docs/TDD-Plan.md`

---

## 依赖与执行顺序

1) Phase 0 先确保测试可运行与 Electron 加载正确；
2) Phase 1 实现 IPC 与 Preload（后续阶段均依赖）；
3) Phase 2 接入 hook 并修测，解锁文件树真实数据；
4) Phase 3/4 增强 UI 与预览；
5) Phase 5 引入聊天与模型；
6) Phase 6 Agent 上下文；
7) Phase 7 监听；
8) Phase 8 E2E；
9) Phase 9 安全；
10) Phase 10 文档。

---

## 边界与安全考虑

- 路径穿越：所有主进程文件操作必须 `path.normalize` 后校验 `startsWith(allowedRoot)`。
- 符号链接：默认不跟随，或限制深度，防止循环。
- 大文件：预览限制（如 1MB），提示用户打开外部编辑器。
- 二进制：仅图片预览，其他显示不支持。
- watcher 风暴：对事件去抖/节流（200ms）。
- WSL/Windows 路径分隔：统一 `path` 处理与显示。
- 权限错误：捕获并向 UI 提供可读错误信息。
- API 密钥：MVP 使用 mock provider，后续通过环境变量配置。

---

## 待确认问题

- 首批 AI 服务对接（OpenAI 兼容/本地模型）优先级？MVP 默认 mock。
- 是否需要多根工作区（multi-root）？MVP 默认单根。
- 预览是否支持 PDF/Office？MVP 暂不支持。
- 目标 Windows 版本（Win10/11）？默认两者均支持。

---

## 验收标准

- 单元与组件测试通过，新模块覆盖率 ≥ 80%；
- 用户可：打开目录 → 浏览树 → 预览文件 → 创建/删除/重命名/搜索；
- 聊天可发送并收到 mock 回复；Agent 可执行简单 `read/rename`；
- 文件变动可通过 watcher 反映到 UI；
- dev 可加载 `http://localhost:3000`，prod 加载 `dist/index.html`；
- E2E 冒烟通过。
