# Bug 修复计划（TDD 驱动）

目标：定位并修复 docs/bug列表.md 中的 5 个问题，并为每个问题提供测试（单元/集成/E2E）与详细实施步骤。最终将把本计划内容保存为 docs/bug修复计划.md。


一、当前问题与根因分析

1) 打开 gtsllm 大目录后卡顿/无响应，预览 300 行 md 正常但切换文件更卡
- 现状：主进程递归读取整个目录树并一次性返回，阻塞时间长；渲染端 FileTree 持有完整树，初次渲染成本高，切换文件高亮（Prism）也较重。
- 直接证据（递归读取）：
```18:27:src/main/ipcHandlers.js
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
```
- 影响：目录很大时，选择目录（select-directory）和 read-directory 都会一次性构建全树，导致主/渲染线程长时间等待与大体积对象传输。
- 其他次要因素：预览区布局未将滚动限制在面板内部，导致大文件时页面整体滚动，增加渲染负担（详见问题 4）。

2) 应用启动窗口过小，三栏无法完整显示
- 现状：窗口默认 800x600。
```3:13:src/main/windowOptions.js
function getWindowOptions() {
  return {
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, '..', 'preload.js'),
    },
  };
}
```

3) 导入文件夹后，Workspace 顶部 3 个按钮（打开/刷新/新建）的图标和文字错乱，变成纵向排布
- 现状：Toolbar 样式在两个文件中重复定义，存在冲突，且存在 height: 100% 等潜在影响布局的样式。
```41:67:src/App.css
/* Toolbar styles */
.file-tree-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 100%;
}
...
.toolbar-btn {
  padding: 6px 12px;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}
```
```60:79:src/styles/layout.css
.file-tree-toolbar {
  display: flex;
  gap: var(--spacing-2);
  margin-top: var(--spacing-2);
}

.toolbar-btn {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-secondary);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.2s ease;
}
```
- 影响：重复定义与不同来源的样式覆盖顺序，可能导致在特定状态（例如 currentPath 出现、容器宽度变化）时按钮内部文本换行、纵向排列。

4) 大文件预览时，应用右侧出现全局长滚动条，左侧与右侧面板也被拉伸
- 现状：预览容器未强约束内部滚动，导致内容高度撑开父级布局；语法高亮器的 pre 设置了 height: 100% 可能放大该问题。
```80:95:src/styles/layout.css
.preview-panel {
  display: flex;
  flex-direction: column;
  min-width: 360px;
}
...
.preview-content {
  overflow: auto;
}
```
```84:92:src/components/FilePreview.css
.file-preview-code {
  height: 100%;
}
/* 语法高亮器代码块 */
.file-preview-code pre[class*="language-"] {
  margin: 0 !important;
  height: 100%;
  border-radius: 4px !important;
  border: 1px solid #e8e8e8;
}
```

5) 右键菜单重命名无效；删除是永久删除，未走回收站，且不可撤销
- 现状：删除使用 fs.rm 强制删除；重命名缺少输入校验（包含路径分隔符等）且用户体验基于 prompt。
```79:82:src/main/ipcHandlers.js
  ipcMain.handle('delete-path', async (_e, targetPath) => {
    await fs.rm(targetPath, { recursive: true, force: true })
    return true
  })
```
```56:69:src/components/FileTree.jsx
  const handleMenuAction = (action) => {
    if (!menu.target) return

    if (action === 'rename') {
      const newName = window.prompt('新名称：', menu.target.name)
      if (newName && newName !== menu.target.name) {
        renamePath(menu.target.path, newName)
      }
    } else if (action === 'delete') {
      const confirmed = window.confirm(`确认删除 ${menu.target.name} ?`)
      if (confirmed) {
        deletePath(menu.target.path)
      }
    }

    setMenu({ visible: false, x: 0, y: 0, target: null })
  }
```


二、修复方案（按 Bug 分类，TDD 步骤）

Bug 1：打开大目录卡顿与切换预览卡顿
- 目标：避免一次性递归读取整个目录树；改为懒加载子目录；确保预览区仅在容器内滚动。
- 测试新增/调整：
  1) main 层新增用例：read-directory 默认只返回浅层（children 字段存在但不递归填充）。
  2) hooks 层新增用例：useFileManager.loadChildren(dir) 能按需为某个目录补全 children，并更新状态。
  3) components 层新增用例：FileTree 展开目录时触发 loadChildren；展开前 children 未加载，展开后出现子项。
  4) E2E（可选）：打开大目录时窗口仍响应（超时阈值内完成首屏渲染）。
- 实施步骤：
  1) 主进程 API 改造
     - 修改 listDir 为浅层遍历，目录项仅附加 children: [] 占位，不继续递归。
     - read-directory(channel) 返回浅层列表；保留 select-directory 返回 { rootPath, entries(浅层) } 的结构。
     - 新增 read-children(channel)：给定目录路径，返回其浅层子项。
  2) preload 暴露新 API：readChildren: (dirPath) => ipcRenderer.invoke('read-children', dirPath)
  3) useFileManager 改造
     - 新增 loadChildren(dirPath) 方法：调用 electronAPI.readChildren，深拷贝更新 files 树中对应目录的 children。
     - refresh 保持现状，但注意与懒加载并存（已加载的节点保留 children）。
  4) FileTree 改造
     - toggleFolder 时：若展开且 file.children.length === 0，则调用 loadChildren(file.path)。
     - 为目录项显示加载态（例如在 children 拉取过程中显示小旋转图标）。
  5) 预览优化（轻量）
     - 避免因布局导致的全局滚动（详见 Bug 4 修复），间接降低大文件交互卡顿。
- 潜在风险与回滚：
  - 变更 IPC 行为需同步更新渲染端逻辑与测试；如需快速回滚，可保留原递归实现为 read-directory-deep 备用开关。

Bug 2：启动窗口过小
- 测试新增：
  - windowOptions.test.js 新增断言：默认 width >= 1200、height >= 800，且设置 minWidth、minHeight。
- 实施步骤：
  - 更新 windowOptions：width: 1280，height: 860，minWidth: 1024，minHeight: 700。
  - 不影响现有安全选项测试。

Bug 3：Toolbar 图标/文字错乱
- 测试新增：
  - 结构性测试（Jest）：Toolbar DOM 结构稳定（按钮包含图标+文案），currentPath 文本显示依然正常，避免回归；CSS 细节通过可视化/E2E 检查。
- 实施步骤：
  1) 样式来源统一
     - 删除/App.css 中的 Toolbar 重复样式（或将其简化为仅覆盖主题色），以 src/styles/layout.css 为准。
     - 在 layout.css 明确：
       - .file-tree-toolbar { display:flex; align-items:center; gap: var(--spacing-2); flex-wrap: nowrap; }
       - .toolbar-btn { display:inline-flex; align-items:center; gap:6px; white-space:nowrap; line-height:1; }
     - current-path 保持 ellipsis，不挤压按钮：必要时将 current-path 放到 header 的独立行，或限制最大宽度。
  2) 可选：将按钮的图标与文字拆分为 <span class="icon"> + <span class="label">，增强可控性。
- 风险：样式覆盖顺序。确保 index.jsx 引入 layout.css，App.jsx 削弱/移除 Toolbar 相关样式，避免覆盖。

Bug 4：全局长滚动条（应将滚动限制在预览面板内部）
- 测试新增：
  - E2E：加载长文本后，document.body 不出现超出视窗的大滚动（滚动应发生在 .preview-content 内）。
- 实施步骤（CSS 调整）：
  1) src/styles/layout.css：
     - .main-content、.file-tree-panel、.preview-panel、.chat-panel 增加 min-height:0;
     - .preview-content 增加 display:flex; flex:1; min-height:0; overflow:auto;
  2) src/components/FilePreview.css：
     - 移除或改为 max-height:100%：.file-preview-code pre[class*="language-"] 的 height:100%;
     - 确保 .file-preview 与 .file-preview-content 保持 flex 布局，内部滚动只发生在 .file-preview-content。

Bug 5：重命名无效；删除应走回收站
- 测试新增/调整：
  1) 主进程：
     - 修改 delete-path 测试，断言使用 electron.shell.trashItem（或 moveItemToTrash）而非 fs.rm。
  2) 渲染层：
     - FileTree.contextmenu 测试新增：当 newName 含路径分隔符（/ 或 \）时，拒绝调用 renamePath 并提示。
- 实施步骤：
  1) 删除到回收站：
     - 主进程 ipcHandlers 中 delete-path 改为 shell.trashItem(targetPath)。如 shell.trashItem 不可用（极端平台），fallback 至 fs.rm，并返回信息提示。
     - preload 无需变更签名。
  2) 重命名输入校验（渲染端）：
     - FileTree.jsx 在调用 renamePath 前校验 newName：非空、不等于原名、不得包含路径分隔符/非法字符。
     - 失败时使用 alert/错误提示并中止。
  3) 可选增强：将 prompt 改为内联编辑输入框，提升交互稳定性（后续迭代）。


三、具体修改点（文件级别）

需要新增的文件
- docs/bug修复计划.md（本文内容，见下文 Markdown 模板）
- src/main/__tests__/ipcHandlers.readChildren.test.js（可选）：read-children 行为测试
- src/hooks/__tests__/useFileManager.loadChildren.test.js：懒加载子目录测试
- src/components/__tests__/FileTree.lazyload.test.jsx：展开目录触发加载测试
- e2e/scrolling.spec.ts（可选）：长文件预览时仅局部滚动

需要修改的文件（及要点）
1) src/main/ipcHandlers.js
- listDir 改为浅层：目录只提供 children: [] 占位，不递归。
- 新增 ipcMain.handle('read-children', ...)：返回 dirPath 的浅层 entries。
- delete-path 改为 shell.trashItem，fallback fs.rm。

2) src/preload.js
- 暴露 readChildren: (dirPath) => ipcRenderer.invoke('read-children', dirPath)

3) src/hooks/useFileManager.js
- 新增 loadChildren(oldDirPath)：调用 electronAPI.readChildren 并将结果合并到 files 树。
- toggle/refresh 逻辑与懒加载并存；错误处理与节流保持。

4) src/components/FileTree.jsx
- toggleFolder：展开目录且 children 为空时调用 loadChildren。
- 上下文菜单：重命名时增加输入校验（禁止 / 和 \ 等非法字符）。
- 目录项可视加载态（简单 loading 文案或小 spinner）。

5) 样式
- src/App.css：删除/精简 .file-tree-toolbar 与 .toolbar-btn 样式，避免覆盖 layout.css。
- src/styles/layout.css：
  - .main-content、.file-tree-panel、.preview-panel、.chat-panel 增加 min-height:0；
  - .preview-content 增加 display:flex; flex:1; min-height:0; overflow:auto；
  - .file-tree-toolbar/.toolbar-btn 细化：inline-flex、white-space:nowrap 等。
- src/components/FilePreview.css：移除 pre 的 height:100% 或改为 max-height:100%。

6) src/main/windowOptions.js
- width: 1280, height: 860, minWidth: 1024, minHeight: 700。

7) 测试调整
- src/main/__tests__/ipcHandlers.fs.test.js：
  - read-directory 断言不期望深度递归（允许 children 存在，但无需深层 children 数据）。
  - delete-path 改为断言 shell.trashItem 调用。
- src/main/__tests__/windowOptions.test.js：新增尺寸断言。
- src/components/__tests__/FileTree.contextmenu.test.jsx：新增重命名非法字符用例。


四、实施顺序（建议）
1) Bug 2（窗口尺寸）——低风险，先改先测。
2) Bug 5（删除回收站 + 重命名校验）——明确收益，修改点集中于主进程和 FileTree。
3) Bug 3（Toolbar 样式冲突清理）——统一样式源，避免引入新冲突。
4) Bug 4（滚动约束）——CSS 调整，E2E 验证。
5) Bug 1（懒加载/性能）——涉及 API 与渲染逻辑，最后实施并全量测试。


五、验收标准（每项均需满足）
- 打开 gtsllm 目录不再出现长时间无响应；展开目录时子项按需加载，切换文件不卡顿。
- 应用启动默认窗口能完整展示三栏，且支持合理的最小尺寸限制。
- Toolbar 按钮图标与文字横向排列，导入文件夹后仍保持整洁，不出现纵向排布。
- 预览大文件时，仅预览面板出现滚动条，页面整体无超长滚动。
- 右键重命名可用且校验非法字符；删除默认进入回收站，失败时有提示。
- 所有新增/调整的单元/集成/E2E 测试通过。


六、潜在边界与风险
- 超大目录（>10万项）仍可能因为懒加载树的频繁更新导致性能抖动：必要时引入虚拟列表（react-window）优化 FileTree 渲染。
- 回收站操作在某些 Linux 发行版可能行为不一致：需在失败时提供清晰提示与永久删除 fallback。
- 语法高亮在超长行上仍可能卡顿：可后续加入 wrapLongLines 与 MAX_LINES 限制下调（例如 1000 行）作为用户可配置项。
- 目录监听（watcher）与懒加载的协同：refresh 时保持已加载节点状态，不回收用户已展开上下文。


七、变更示例（关键代码位置示意）
- ipcHandlers.js：递归 -> 浅层 + read-children
```18:27:src/main/ipcHandlers.js
// 由递归改为浅层，只设置 children: []
```
- ipcHandlers.js：删除到回收站
```79:82:src/main/ipcHandlers.js
// 改为 shell.trashItem(targetPath)，并在 shell 不可用时 fallback fs.rm
```
- windowOptions.js：尺寸调整
```3:13:src/main/windowOptions.js
// width/height 改为更大，并新增 minWidth/minHeight
```
- FileTree.jsx：重命名校验 + 懒加载展开
```56:69:src/components/FileTree.jsx
// 在调用 renamePath 前增加非法字符校验；展开目录时若 children 为空，调用 loadChildren
```
- CSS：统一 Toolbar 样式与预览滚动容器
```41:67:src/App.css
// 移除/精简 Toolbar 相关样式，避免与 layout.css 冲突
```
```60:79:src/styles/layout.css
// 细化 file-tree-toolbar/.toolbar-btn；为 preview-panel/preview-content 增加 flex 与 min-height:0
```
```84:92:src/components/FilePreview.css
// 移除 pre 的 height:100% 或改为 max-height:100%
```


八、提交划分（建议）
- Commit 1：windowOptions 尺寸 + 测试
- Commit 2：delete-path 回收站 + 测试
- Commit 3：FileTree 重命名校验 + 测试
- Commit 4：样式统一（Toolbar）+ 手工校验截图
- Commit 5：预览滚动约束修复 + 可选 E2E
- Commit 6：目录懒加载（主/渲染改造）+ 全量测试


九、文档输出：docs/bug修复计划.md（建议内容）

```markdown
# bug修复计划

基于 docs/bug列表.md 的 5 个问题，采用 TDD 方式推进：先测后改，逐步提交，确保每步可回滚。

## 1. 打开大目录卡顿/预览切换卡顿
- 修复策略：read-directory 改为浅层 + read-children 懒加载；预览滚动限制在面板内。
- 验收标准：打开 gtsllm 目录无长时间无响应；展开目录时按需加载；切换文件不卡顿。
- 测试：主进程浅层读取；useFileManager.loadChildren；FileTree 展开触发加载；（可选）E2E 首屏性能。

## 2. 启动窗口过小
- 修复策略：默认 1280x860，最小 1024x700。
- 验收标准：三栏默认可见。
- 测试：windowOptions 尺寸断言。

## 3. Toolbar 图标/文字错乱
- 修复策略：统一到 layout.css；按钮使用 inline-flex + nowrap，去除冲突样式。
- 验收标准：导入目录后按钮仍横向排列、样式整洁。
- 测试：结构性测试 + 手工/截图验证。

## 4. 全局长滚动条
- 修复策略：为 preview-panel/preview-content 增加 flex:1 + min-height:0；FilePreview 取消 pre 的 height:100%。
- 验收标准：长文件时仅预览面板滚动。
- 测试：（可选）E2E 验证滚动容器。

## 5. 重命名无效；删除应走回收站
- 修复策略：主进程使用 shell.trashItem；渲染端重命名校验非法字符。
- 验收标准：重命名生效且有校验；删除进入回收站。
- 测试：delete-path 使用 trashItem；FileTree 重命名非法字符不调用 rename。

## 实施顺序
1) 窗口尺寸 -> 2) 回收站/重命名 -> 3) 样式统一 -> 4) 滚动修复 -> 5) 懒加载与性能

## 风险与回滚
- 懒加载影响范围大，保留 read-directory-deep 作为回滚开关。
- Linux 回收站兼容性差异，失败回退到 fs.rm 并提示。

```

— 以上。