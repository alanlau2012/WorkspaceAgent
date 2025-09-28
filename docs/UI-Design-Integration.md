## UI 设计集成与深色主题改造指南

本指南说明如何将现有主界面升级为设计稿的深色三栏布局（左文件树 / 中预览 / 右聊天），并以 TDD 的方式实施与验收，确保现有功能与测试保持通过。

### 目标
- **三栏布局**：文件树（可水平拖拽调整）、预览区、聊天面板（可水平拖拽调整）。
- **深色主题**：统一由 CSS Token 驱动（变量化），便于维护与扩展。
- **标题栏**：默认使用视觉等效的内容区标题栏；可通过开关启用自定义标题栏（frame: false）。
- **TDD**：先写/调整测试，再做最小实现（红-绿-重构）。

## 架构与 TDD 工作流
1. 保持现有单测通过（`ChatPanel`/`FileTree`/`FilePreview` 等）。
2. 新增布局与标题栏可见性的测试（先失败）：`src/__tests__/AppLayout.test.jsx`。
3. 新增全局样式与 Token 文件，引入至 `src/index.jsx`（先写最小断言确保 class/文本存在）。
4. 重构 `src/App.jsx`：移除 Antd `Layout/Sider/Content`，改为自定义三栏 DOM 结构与类名。
5. 组件样式深色化与变量化（不改变 DOM 结构，降低回归风险）。
6. 预览区头部信息展示（不影响既有测试的前提下增强）。
7. 可选：启用自定义标题栏（`FEATURE_CUSTOM_TITLEBAR`），并补充主进程测试。
8. 文档与 E2E：补充本文档；E2E 可保持冒烟或在后续增强。

## 设计 Token（`src/styles/tokens.css`）
将设计稿中的色板与尺寸作为 CSS 变量维护。以下为建议的最小集（来自 `design/workspace-agent-ui-mockup.html`，并补充常用文本/边框变量）：

```css
:root {
  /* 主色调 - Cursor 蓝色系（设计稿） */
  --primary-50:  #0f1419;
  --primary-100: #1a1f29;
  --primary-200: #252a35;
  --primary-300: #2d3441;
  --primary-400: #383e4d;
  --primary-500: #4c5566;
  --primary-600: #6b7280;
  --primary-700: #9ca3af;
  --primary-800: #d1d5db;
  --primary-900: #f3f4f6;

  /* 品牌色（设计稿） */
  --brand-primary:   #007acc;
  --brand-secondary: #1e90ff;
  --brand-accent:    #00d4ff;

  /* 背景层级（设计稿） */
  --bg-primary:   #0d1117;
  --bg-secondary: #161b22;
  --bg-tertiary:  #21262d;
  --bg-overlay:   #30363d;
  --bg-elevated:  #373e47;

  /* 边框（设计稿+补充） */
  --border-primary:  #30363d;
  --border-secondary:#3d4450;
  --border-focus:    #1e90ff;

  /* 文本（补充，适配深色） */
  --text-primary:   #e6edf3;
  --text-secondary: #9aa4b2;
  --text-muted:     #79808a;

  /* 交互与状态（补充） */
  --surface-hover:  rgba(255,255,255,0.04);
  --surface-active: rgba(255,255,255,0.06);

  /* 尺寸与圆角（可按需调整） */
  --radius-sm: 6px;
  --radius-md: 8px;
  --spacing-1: 6px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --text-xs:   12px;
  --text-sm:   14px;
  --text-md:   16px;
}

/* 全局 reset 与滚动条 */
html, body, #root { height: 100%; background: var(--bg-primary); color: var(--text-primary); }
* { box-sizing: border-box; }
::selection { background: var(--brand-secondary); color: #fff; }

/**** 深色滚动条（webkit） ****/
* { scrollbar-width: thin; scrollbar-color: var(--border-primary) transparent; }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: var(--border-primary); border-radius: 8px; }
::-webkit-scrollbar-thumb:hover { background: var(--surface-hover); }
```

> 说明：为兼容测试与样式断言，文本与边框变量命名尽量贴合使用场景；如后续设计有更细分的 Token，可逐步替换。

## 全局布局样式（`src/styles/layout.css`）
三栏布局的主要类名与约束：

```css
.app-container { position: relative; height: 100vh; background: var(--bg-primary); }
.titlebar {
  position: fixed; top: 0; left: 0; right: 0; height: 32px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.titlebar-title { font-size: var(--text-xs); color: var(--text-secondary); font-weight: 500; }

.main-content {
  position: absolute; top: 32px; bottom: 0; left: 0; right: 0;
  display: grid; grid-template-columns: auto 1fr auto; gap: 0;
}

.file-tree-panel {
  width: 300px; min-width: 200px; max-width: 500px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-primary);
  display: flex; flex-direction: column; resize: horizontal; overflow: hidden;
}
.file-tree-header { padding: var(--spacing-3) var(--spacing-4); border-bottom: 1px solid var(--border-primary); background: var(--bg-tertiary); }
.file-tree-title { font-size: var(--text-sm); color: var(--text-secondary); }
.file-tree-toolbar { display: flex; gap: var(--spacing-2); margin-top: var(--spacing-2); }
.toolbar-btn { background: transparent; color: var(--text-secondary); border: 1px solid var(--border-secondary); padding: 4px 8px; border-radius: var(--radius-sm); }
.toolbar-btn:hover { background: var(--surface-hover); }

.preview-panel { display: flex; flex-direction: column; min-width: 360px; }
.preview-header { padding: var(--spacing-3) var(--spacing-4); border-bottom: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-secondary); }
.preview-content { overflow: auto; }

.chat-panel {
  width: 350px; min-width: 300px; max-width: 600px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-primary);
  display: flex; flex-direction: column; resize: horizontal; overflow: hidden;
}
```

## `App.jsx` 结构（替代 Antd Layout）
- 移除 `antd` 的 `Layout/Sider/Content` 引用与使用。
- 使用以下 DOM 结构（示意），保留原有子组件：

```jsx
<div className="app-container">
  <div className="titlebar">
    <div className="titlebar-title">WorkspaceAgent - AI 文件管理助手</div>
  </div>
  <div className="main-content">
    <aside className="file-tree-panel" style={{ resize: 'horizontal', overflow: 'hidden' }}>
      <div className="file-tree-header">
        <div className="file-tree-title">工作区文件</div>
        <div className="file-tree-toolbar">
          <button className="toolbar-btn">📁 打开</button>
          <button className="toolbar-btn">🔄 刷新</button>
          <button className="toolbar-btn">➕ 新建</button>
        </div>
      </div>
      <FileTree onFileSelect={handleFileSelect} showSearch={true} />
    </aside>

    <section className="preview-panel">
      <div className="preview-header">{/* 选中文件名/路径 */}</div>
      <div className="preview-content">
        <FilePreview file={selectedFile} />
      </div>
    </section>

    <aside className="chat-panel" style={{ resize: 'horizontal' }}>
      <ChatPanel context={{ selectedFile, workspacePath: window.__WORKSPACE_PATH__ || '' }} />
    </aside>
  </div>
</div>
```

## 引入全局样式（`src/index.jsx`）
在文件顶部引入：

```js
import './styles/tokens.css';
import './styles/layout.css';
```

## 组件样式深色化与变量化
- **`src/components/FileTree.css`**：
  - `.file-tree` 改为 `background: var(--bg-secondary); border-right: 1px solid var(--border-primary);`
  - 搜索框 `.search-input` 使用 `border-color: var(--border-secondary);`，聚焦 `outline/box-shadow` 使用 `var(--border-focus)`。
- **`src/components/FilePreview.css`**：
  - `.file-preview-header` 改为 `background: var(--bg-tertiary); border-bottom: 1px solid var(--border-primary);`
  - `code/pre` 背景 `var(--bg-secondary)`、文本 `var(--text-primary)`。
- **`src/components/Chat/ChatPanel.css`**：
  - `.chat-panel` 改为 `background: var(--bg-secondary); border-left: 1px solid var(--border-primary);`
  - header 使用 `var(--bg-tertiary)`；输入/下拉边框 `var(--border-secondary)`；聚焦 `var(--border-focus)`；主要按钮背景 `var(--brand-primary)`。

> 注意：保持组件 DOM 结构与关键文案不变（如“AI 助手”“输入消息...”），以确保现有测试稳定。

## 标题栏策略与开关
- 默认：不改动主进程窗口参数，仅在内容区实现视觉等效标题栏。
- 可选开关：`FEATURE_CUSTOM_TITLEBAR=1` 时启用自定义标题栏。
  - 修改 `src/main/windowOptions.js`：在开关开启时设置 `frame: false`（Win/Linux），`backgroundColor: '#0d1117'` 以避免白屏闪烁；macOS 可配置 `titleBarStyle: 'hiddenInset'`。
  - 对应测试：`src/main/__tests__/windowOptions.test.js` 新增/更新断言，校验开关行为。

## 测试方案
- 新增：`src/__tests__/AppLayout.test.jsx`
  - 断言标题栏文本“WorkspaceAgent - AI 文件管理助手”显示。
  - 断言左侧标题“工作区文件”与工具栏按钮存在。
  - 断言右侧“AI 助手”依然可见。
- 现有测试：保持 `ChatPanel/FileTree/FilePreview` 测试通过。
- 预览区增强测试：
  - 未选文件时显示占位文案（沿用 `FilePreview` 现有断言）。
  - 选中文件时 `.preview-header` 渲染文件名。
- 主进程（可选）：`windowOptions` 在开关开启/关闭时的配置断言。

## E2E 策略（本次可选）
- **方案 A（快速）**：保留现有冒烟 E2E（验证 `src/index.html` 的“你好，Electron！”），不阻断本次改造。
- **方案 B（增强）**：新增一个用例，访问本地 dev server，断言“AI 助手”与标题栏文本；CI 中按项目脚本先启动 renderer 服务。

## 验收标准
- 渲染 `<App />` 时：
  - 顶部出现标题栏文案，样式与深色主题一致；
  - 左侧“工作区文件”标题、工具栏、搜索可见；
  - 中间预览头部与内容可见；
  - 右侧聊天面板“AI 助手”可见；
  - 所有样式使用 Token（无浅色残留）；
  - 所有现有单测通过；新增 `AppLayout.test.jsx` 通过；
  - （若启用）`windowOptions` 开关测试通过。

## 变更清单
- 新增文件：
  - `src/styles/tokens.css`
  - `src/styles/layout.css`
  - `src/__tests__/AppLayout.test.jsx`
  - （可选）`src/components/Titlebar.jsx`
  - 文档：`docs/UI-Design-Integration.md`
- 修改文件：
  - `src/index.jsx`（引入新样式）
  - `src/App.jsx`（重构布局 DOM 结构，移除 Antd 布局）
  - `src/components/FileTree.css`（变量化/深色）
  - `src/components/FilePreview.css`（变量化/深色）
  - `src/components/Chat/ChatPanel.css`（变量化/深色）
  - （可选）`src/main/windowOptions.js` 与其测试

## 风险与回退
- **对比度与可读性**：深色主题易出现对比不足，必要时微调 `--text-secondary` `--border-secondary`。
- **面板宽度溢出**：依赖 `min/max-width` 与 `resize: horizontal`，预留预览区最小宽度。
- **跨平台标题栏**：自定义标题栏差异较大，建议先通过开关控制，分阶段落地。
- **测试稳定性**：严格遵循 TDD；新增 UI 文案稳定后再行快照。

## 实施小结
- 以 TDD 驱动的方式逐步替换布局与样式，先保功能稳、再逐步美化。
- Token 化样式保障一致性与可扩展性；自定义标题栏通过开关渐进式启用。
