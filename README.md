# WorkspaceAgent

本项目为最小可运行的 Electron + 本地 Agent MVP。

## 开发

```bash
npm start
```

## 单元与组件测试（Jest）

```bash
npm test
```

## E2E 冒烟（Playwright）

首次安装浏览器依赖（若失败可跳过，仅用于本地验证）：

```bash
npx --yes playwright install --with-deps
```

运行冒烟用例：

```bash
npm run test:e2e
```

注：当前冒烟用例使用 `src/index.html` 静态页面进行占位校验，后续可替换为 Electron Driver 方式。
