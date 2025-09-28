# Architecture Overview

## 进程与模块

- Main：窗口创建、IPC `watch-directory` / `stop-watching`（MVP）。
- Renderer：Agent 逻辑（`agent/`）、上下文管理（`contextManager`）、工作区状态（`workspaceStore`）。

## 安全

- `BrowserWindow`：`contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`。
- `index.html`：CSP 限制资源来源并允许 `img data:`。

## 测试

- 单测（Jest）：`agent/`、`stores/`、`main/ipc/`、CSP。
- E2E（Playwright）：冒烟用例，后续可替换为 Electron 驱动方案。

