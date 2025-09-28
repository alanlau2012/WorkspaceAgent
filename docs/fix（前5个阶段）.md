# WorkspaceAgent 前五阶段修复方案（TDD驱动）

> 目标：在不破坏既有代码的前提下，修复前五阶段（Phase 0~5）应交付的功能链路。每一步均需“测试先行 → 最小实现 → 重构”，并可独立验证。涉及 Electron 主进程、Preload、渲染层 Hook/组件、聊天面板集成等。

---

## 概览
- **瓶颈**：当前应用只展示 TreeView，原因是 IPC 体系缺失、Hook 仍使用 mock 数据、界面未接入聊天面板。
- **策略**：按照 Phase 顺序分组修复，每个阶段拆成可验证的子任务，确保逐项落地。
- **验证**：单元测试/组件测试/集成测试 + 手工冒烟流程（启动应用 → 选择目录 → 预览文件 → 聊天回声）。

---

## Phase 0 — 基线修复（工具链 & 主进程加载）

### Step 0.1 修复 Jest 配置
- **测试**：编写 `jest.config.test.js`（或直接运行 `npx jest --config jest.config.js --listTests`）预期失败，原因是 CSS 模块未映射。
- **实现**：将 `jest.config.js` 中的 `moduleNameMapping` 更名为 `moduleNameMapper`。
- **验证**：执行 `npm test -- --watchAll=false`，确认 Jest 能加载 CSS mock。

### Step 0.2 抽离入口解析工具
- **测试**：新增 `src/main/__tests__/resolveIndexUrl.test.js`，覆盖 dev/prod 情况；初始运行失败。
- **实现**：
  - 新建 `src/main/utils.js` 导出 `resolveIndexUrl({ isDev, devServerUrl, prodIndexPath })`。
  - 单测覆盖默认值与传入路径。
- **验证**：`npm test -- resolveIndexUrl` 通过。

### Step 0.3 主进程加载差异化
- **测试**：使用 `electron-mocha`（或普通 Jest 配合 `mock-electron`）为 `createWindow` 写集成测试（mock `BrowserWindow`）。初始失败：未设置 preload/URL。
- **实现**：
  - `src/main.js` 中引入 `resolveIndexUrl`，根据 `NODE_ENV` 加载 dev/prod；设置 `preload`。
  - 开发模式加载 `process.env.VITE_DEV_SERVER_URL`（通过 Vite 插件注入），默认 `http://localhost:5173`。
- **验证**：
  - 单测通过。
  - 手动运行 `npm run dev`，确认 Electron 窗口打开 React 应用。

---

## Phase 1 — IPC 模块化（文件系统能力）

### Step 1.1 构建目录树纯函数
- **测试**：`src/shared/__tests__/fsTree.test.js` 覆盖嵌套目录、符号链接忽略、权限异常、隐藏文件过滤。初始失败（函数不存在）。
- **实现**：新建 `src/shared/fsTree.js` 导出 `buildFSTree(rootPath, options)`；使用 `fs/promises` & `path`，控制深度、忽略模式。
- **验证**：单测通过。

### Step 1.2 主进程 IPC Handler 架构
- **测试**：`src/main/__tests__/ipc-fileSystem.test.js` 使用 Jest + mock（`jest.mock('fs/promises')`、`jest.mock('chokidar')`）。覆盖：
  - `select-directory` 返回树（调用 `dialog.showOpenDialog`）。
  - 读/写/创建/删除/重命名路径校验。
  - Watcher 事件推送。
  - 越权访问抛错。
- 初始执行失败。
- **实现**：
  - 新建 `src/main/ipc/fileSystem.js`，使用 `ipcMain.handle` 注册各通道；维护 `windowWatchers` Map。
  - 在 `registerFileSystemIpc` 中接入 `buildFSTree`。
  - 调整 `src/main/ipcHandlers.js`：导出 `registerIpcHandlers(app, BrowserWindow, dialog)`，内部调用 `registerFileSystemIpc`。
- **验证**：单测通过；`npm test -- ipc-fileSystem`。

### Step 1.3 Preload API 对齐
- **测试**：`src/__tests__/preload.test.js`（或 `src/preload/__tests__/api.test.js`）使用 `jest.mock('electron', ...)` 验证 `contextBridge.exposeInMainWorld` 参数。初始失败。
- **实现**：
  - 扩展 `preload.js` 导出 `createFile`、`deleteFile`、`renameFile`、`searchFiles` 等；提供 `onFileChanged(callback)` 和 `offFileChanged(callback)`。
- **验证**：单测通过。

---

## Phase 2 — Hook 接入真实 API

### Step 2.1 重写 `useFileManager`
- **测试**：`src/hooks/__tests__/useFileManager.test.js`：
  - Mock `window.electronAPI` 的所有方法。
  - 覆盖 `loadDirectory`、`create/delete/rename/search` 流程、错误处理、watch 刷新。
  - 初始失败（Hook 仍使用 mock 数据）。
- **实现**：
  - 移除初始化 mock；组件挂载时调用 `loadDirectory`（触发对话框）。
  - 将 `createFile` 等操作调用真实 IPC；watch 事件回调刷新目录。
  - 支持 `searchResults` 状态。
- **验证**：单测通过；在 Electron 中实测选择目录后展示真实树。

### Step 2.2 渲染层监听清理
- **测试**：在 Hook 测试中新增“组件卸载时停止 watch”的断言。
- **实现**：
  - `useEffect` 清理函数调用 `stopWatching` 与 `removeFileChangedListener`。
- **验证**：测试通过。

---

## Phase 3 — FileTree 工具栏与交互

### Step 3.1 UI/交互增强
- **测试**：`src/components/__tests__/FileTree.test.jsx`：
  - Mock Hook 返回值；验证工具栏按钮调用 `loadDirectory`、`createFile`、`renameFile`、`deleteFile`。
  - 验证目录展开、文件点击回调 `onFileSelect`。
- **实现**：
  - 引入 Ant Design 或自定义按钮栏。
  - 提供刷新、选择根目录、新建、重命名、删除操作；状态提示。
  - 支持空态、加载态、错误态 UI。
- **验证**：组件测试通过；在应用中操作按钮，观察 IPC 调用日志。

### Step 3.2 Watch 事件触发刷新
- **测试**：同一测试文件中模拟 `onFileChanged` 回调，断言 `loadDirectory` 被再次调用（使用 Jest mock）。
- **实现**：Hook 内在事件回调中触发 `loadDirectory(currentPath)`。
- **验证**：组件测试通过；实际监听生效。

---

## Phase 4 — FilePreview 功能对齐

### Step 4.1 统一读取逻辑
- **测试**：`src/components/__tests__/FilePreview.test.jsx`：
  - Mock `window.electronAPI.readFile`，覆盖文本、代码、图片（dataURL）与不支持类型。
  - 验证大文件提示（模拟返回 `__large__` 标记或长度 > 1MB）。
- 初始失败。
- **实现**：
  - `FilePreview.jsx` 强制使用 `electronAPI`；当文件体积 > 1MB（调用前可从 `stat` IPC 获取或主进程直接判断）提示无法预览。
  - 图片类型直接渲染 `img`；异常时显示错误提示。
- **验证**：组件测试通过；实际预览文本/图片。

### Step 4.2 主进程配合
- **测试**：在 IPC 测试中新增图片文件返回 Base64、超限文件抛提示的用例。
- **实现**：
  - `read-file` handler 支持根据扩展名判断是否返回 `dataUrl`。
  - 限制文件大小（如 > 1MB 抛出自定义错误）。
- **验证**：IPC 测试通过；渲染层错误提示正确。

---

## Phase 5 — ChatPanel 集成

### Step 5.1 Zustand Store 初始化校验
- **测试**：`src/stores/__tests__/chatStore.test.js`：
  - 初始化状态；发送消息流程（mock `llmClient`）。
  - 初始失败。
- **实现**：
  - 为测试导出 `createChatStore` 工厂或在测试中使用 `useChatStore.getState()`。
- **验证**：单测通过。

### Step 5.2 `llmClient` 测试化
- **测试**：`src/services/__tests__/llmClient.test.js`：
  - 覆盖 mock-echo、mock-assistant 行为；未配置模型抛错。
- **实现**：若需可注入随机数/延迟，方便测试。
- **验证**：单测通过。

### Step 5.3 布局整合三栏
- **测试**：`src/App.test.jsx`（React Testing Library）：
  - Mock Hook & Store，渲染后应存在 Tree、Preview、ChatPanel DOM 节点。
  - 初始失败（缺少 ChatPanel）。
- **实现**：
  - `App.jsx` 引入 `ChatPanel`，布局改为三栏（左 Tree、中 Preview、右 Chat）。
  - 将 `selectedFile`、`currentPath` 等上下文传递给 `ChatPanel`。
- **验证**：组件测试通过；启动应用观察三栏布局。

### Step 5.4 聊天回声冒烟
- **测试**：编写 Playwright/Electron 冒烟脚本（可选）或手工验证脚本：
  1. 启动 dev。
  2. 选择样例目录。
  3. 预览文件。
  4. 在聊天面板发送“测试”，期待收到`回声: 测试`。
- **实现**：若使用自动化，新增 `e2e/phase5-smoke.spec.ts`。
- **验证**：脚本通过或手工记录截图。

---

## 汇总
- 每个 Step 均要求：**先写测试→跑红→实现→跑绿→必要时重构**。
- 修复顺序紧扣依赖链：Phase 0 打底 → Phase 1 IPC → Phase 2 Hook → Phase 3 组件 → Phase 4 预览 → Phase 5 聊天。
- 完成后需确保 `npm test` 全绿，并运行 `npm run lint`（若配置）及 dev 冒烟。

