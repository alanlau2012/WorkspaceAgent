文件名：docs/预览plan.md

# 中间预览界面实现方案（TDD）

本方案目标：当用户在左侧工作区（FileTree）点击文件时，中间预览区展示文件内容，并支持主流代码格式的语法高亮；图片可直接预览，纯文本/日志/CSV 等正常显示。方案遵循测试驱动开发（TDD）的“红-绿-重构”流程，并兼顾安全与性能。

---

## 1. 现状与差距

- 预览组件已存在：src/components/FilePreview.jsx，可展示文本、代码（无高亮）、图片（依赖 readFile 返回数据 URL）。
- IPC 已有：read-file（返回 utf-8 文本），尚未对二进制/图片友好处理。
- FileTree 点击文件后可传递到 FilePreview 展示。

现有关键代码参考：

```19:27:src/components/FilePreview.jsx
  const isCodeFile = useCallback((filename) => {
    const codeExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'scss', 'less', 'json', 'xml', 'yaml', 'yml']
    return codeExts.includes(getFileType(filename))
  }, [getFileType])

  const isTextFile = useCallback((filename) => {
    const textExts = ['txt', 'md', 'log', 'csv']
    return textExts.includes(getFileType(filename))
  }, [getFileType])
```

```68:96:src/components/FilePreview.jsx
  const renderContent = () => {
    if (!file) {
      return <div className="file-preview-empty">请选择一个文件进行预览</div>
    }

    if (isLoading) {
      return <div className="file-preview-loading">加载中...</div>
    }

    if (error) {
      return <div className="file-preview-error">{error}</div>
    }

    if (isImageFile(file.name)) {
      return (
        <div className="file-preview-image">
          <img src={content} alt={file.name} />
        </div>
      )
    }

    if (isCodeFile(file.name) || isTextFile(file.name)) {
      return (
        <div className="file-preview-code">
          <pre><code>{content}</code></pre>
        </div>
      )
    }
```

```4:8:src/main/ipcHandlers.js
function registerIpcHandlers() {
  ipcMain.handle('read-file', async (_event, filePath) => {
    return fs.readFile(filePath, 'utf-8')
  })
}
```

```4:11:src/preload.js
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件系统相关API
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  watchDirectory: (directoryPath) => ipcRenderer.invoke('watch-directory', directoryPath),
  stopWatching: () => ipcRenderer.invoke('stop-watching'),
```

差距：
- 代码语法高亮缺失；
- 图片/二进制读取未在主进程处理为 data URL；
- 文件过大/未知编码等边界未处理；
- 需要更丰富的语言识别与扩展。

---

## 2. 开源组件调研与选型（GitHub）

候选：
- react-syntax-highlighter（Prism/Highlight.js）
  - GitHub: https://github.com/react-syntax-highlighter/react-syntax-highlighter
  - 优点：集成简单、无 Worker、SSR 友好、语言覆盖广；适合“只读预览”。
- @monaco-editor/react（Monaco）
  - GitHub: https://github.com/suren-atoyan/monaco-react
  - 优点：语言支持全面、VSCode 体验；缺点：Electron + Vite 需 Worker 配置，体积较大，测试中需要额外 mock。
- @uiw/react-codemirror（CodeMirror 6）
  - GitHub: https://github.com/uiwjs/react-codemirror
  - 优点：现代、可扩展；缺点：语言按需装配，预览只读场景集成成本略高。
- shiki
  - GitHub: https://github.com/shikijs/shiki
  - 优点：VSCode 级别高亮；缺点：浏览器端需要 WASM & 资源加载，Electron 打包配置更复杂。

选型结论：首期采用 react-syntax-highlighter（Prism）实现“只读语法高亮”，满足主流语言预览；后续如需编辑能力再评估 Monaco/CodeMirror。

---

## 3. 目标与验收标准

- 代码文件：显示带语法高亮的只读内容；支持至少：js/jsx/ts/tsx/json/html/css/scss/less/xml/yaml/yml/py/java/c/cpp/sh/bash/md/go/php/rb/rs/ini/toml。
- 文本文件：正常显示（txt/log/csv 等）。
- 图片：直接显示（jpg/jpeg/png/gif/webp/svg/bmp）。
- 错误与加载：显示“加载中…/读取失败/不支持预览/文件过大”提示。
- 性能：>1MB 文本默认只加载前 2000 行并提示已截断；图片 >10MB 显示不预览提示。
- 安全：不执行任何远程脚本；Markdown（若启用）进行严格渲染，禁止原始 HTML。
- 测试：所有新增与修改测试全部通过；核心功能覆盖率 100%。

---

## 4. 变更列表

新增文件：
- docs/预览plan.md（本文档）
- src/utils/languageMapping.js（扩展名到 Prism 语言映射 & 文件类型判断）
- src/components/__tests__/FilePreview.highlight.test.jsx（语法高亮相关单测）
- src/main/__tests__/ipcHandlers.readFileBinary.test.js（图片/大文件等 IPC 单测）
- tests/e2e/preview.spec.ts（可选：Playwright E2E）

修改文件：
- package.json（新增依赖）
- src/components/FilePreview.jsx（集成语法高亮 + 图片/大文件处理 + markdown 可选）
- src/components/FilePreview.css（样式微调）
- src/preload.js（readFile 支持 options，可向后兼容）
- src/main/ipcHandlers.js（read-file 支持二进制/图片转 data URL、大小阈值、按需编码）

---

## 5. 实施步骤（TDD）

步骤 0：安装依赖（先写测试再实现，但需先准备依赖）

```bash
npm i -S react-syntax-highlighter prismjs mime-types
# 如需启用 Markdown：
npm i -S react-markdown remark-gfm
```

步骤 1：单元测试（红）
- 新建 src/components/__tests__/FilePreview.highlight.test.jsx，覆盖：
  - 语法高亮容器渲染（代码文件返回的 <code> 上含 language-xxx 类名）。
  - 非代码文本渲染。
  - 图片渲染（使用 base64 data URL）。
  - 大文件截断提示。
  - 不支持类型提示。
- 新建 src/main/__tests__/ipcHandlers.readFileBinary.test.js，覆盖：
  - 读取 .png/.jpg 返回 data:image/*;base64, 前缀。
  - 文本默认 utf-8。
  - 超过大小限制返回错误或提示对象。

步骤 2：最小实现（绿）
- main/ipcHandlers.js：增强 read-file 支持：
  - 依据扩展名判断是否图片；图片走二进制 Buffer -> base64 -> data URL。
  - 文本按 utf-8；允许通过 options.encoding 指定 'utf-8' | 'base64' | null。
  - 大小阈值（例如 1MB 文本，10MB 图片）。
- preload.js：readFile(filePath, options) — options 可选，保持向后兼容（旧签名仍可用）。
- FilePreview.jsx：
  - 引入 react-syntax-highlighter（Prism）及主题；
  - 通过扩展名映射设定 language，回退为 text；
  - 大文件截断文案；
  - 图片直接用 data URL。

步骤 3：重构与完善
- 语言映射抽离到 src/utils/languageMapping.js，便于单测与扩展。
- 样式微调，统一主题色；
- 可选：Markdown 使用 react-markdown + 代码块用 SyntaxHighlighter 渲染。

步骤 4：集成/E2E
- 组件集成测试：点击 FileTree 文件，预览区展示对应内容。
- 可选 E2E（Playwright）：启动 Electron，选择示例工程，点击 .js/.png，断言预览区渲染。

---

## 6. 具体改动说明与示例代码

### 6.1 语言映射（新增）
文件：src/utils/languageMapping.js

```javascript
// 支持的扩展名 -> Prism 语言标识
export const extensionToLanguage = {
  js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
  json: 'json', md: 'markdown', html: 'html',
  css: 'css', scss: 'scss', less: 'less',
  xml: 'markup', yaml: 'yaml', yml: 'yaml', toml: 'toml', ini: 'ini',
  py: 'python', java: 'java', c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
  go: 'go', rs: 'rust', rb: 'ruby', php: 'php', sh: 'bash', bash: 'bash',
  txt: 'text', log: 'text', csv: 'text'
}

export const imageExtensions = ['jpg','jpeg','png','gif','bmp','webp','svg']
export const textLikeExtensions = ['txt','md','log','csv','ini','toml']

export function getExt(name='') {
  const idx = name.lastIndexOf('.')
  return idx > -1 ? name.slice(idx + 1).toLowerCase() : ''
}

export function isImage(name) { return imageExtensions.includes(getExt(name)) }
export function isCode(name) { return !!extensionToLanguage[getExt(name)] && !isImage(name) }
export function isText(name) {
  const ext = getExt(name)
  return textLikeExtensions.includes(ext) || (!isImage(name) && !extensionToLanguage[ext])
}

export function languageOf(name) { return extensionToLanguage[getExt(name)] || 'text' }
```

### 6.2 主进程 IPC（修改）
文件：src/main/ipcHandlers.js（增强 read-file）

```javascript
// 伪代码示例，按需调整
const path = require('path')
const fs = require('fs/promises')
const mime = require('mime-types')

const MAX_TEXT_BYTES = 1024 * 1024 // 1MB
const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10MB

function isImageExt(ext) {
  return ['.jpg','.jpeg','.png','.gif','.bmp','.webp','.svg'].includes(ext)
}

function registerIpcHandlers() {
  ipcMain.handle('read-file', async (_event, filePath, options = {}) => {
    const ext = path.extname(filePath).toLowerCase()
    const stat = await fs.stat(filePath)

    if (isImageExt(ext)) {
      if (stat.size > MAX_IMAGE_BYTES) {
        return { error: 'IMAGE_TOO_LARGE', size: stat.size }
      }
      const buf = await fs.readFile(filePath)
      const base64 = buf.toString('base64')
      const mimeType = mime.lookup(ext) || 'application/octet-stream'
      return { type: 'image', content: `data:${mimeType};base64,${base64}`, size: stat.size }
    }

    // 文本/代码：默认 utf-8
    if (stat.size > MAX_TEXT_BYTES) {
      // 只读取前 ~1MB，用于预览
      const fh = await fs.open(filePath, 'r')
      const buf = Buffer.alloc(MAX_TEXT_BYTES)
      const { bytesRead } = await fh.read(buf, 0, MAX_TEXT_BYTES, 0)
      await fh.close()
      return { type: 'text', content: buf.subarray(0, bytesRead).toString('utf-8'), truncated: true, size: stat.size }
    }

    const encoding = options.encoding ?? 'utf-8'
    const content = await fs.readFile(filePath, encoding)
    return { type: 'text', content, size: stat.size }
  })
}
```

注意：返回结构从纯字符串调整为对象。为保持兼容，可在 preload 或 renderer 做兼容逻辑（优先消费对象，回退字符串）。

### 6.3 Preload（修改，向后兼容）
文件：src/preload.js

```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (filePath, options) => ipcRenderer.invoke('read-file', filePath, options),
  // 其余保持不变
})
```

### 6.4 预览组件（修改）
文件：src/components/FilePreview.jsx（要点）

```javascript
import React, { useState, useEffect, useCallback } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { isImage, isCode, isText, languageOf } from '../utils/languageMapping'

const MAX_LINES = 2000

export const FilePreview = ({ file }) => {
  const [content, setContent] = useState('')
  const [meta, setMeta] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadFileContent = useCallback(async () => {
    if (!file) { setContent(''); setMeta({}); return }
    setIsLoading(true); setError(null)
    try {
      const res = await (window.electronAPI?.readFile?.(file.path) ?? Promise.resolve(''))
      const data = typeof res === 'string' ? { type: isImage(file.name)? 'image':'text', content: res } : res
      setMeta(data)
      setContent(data.content || '')
    } catch (e) {
      setError(`文件读取失败: ${e.message}`)
    } finally { setIsLoading(false) }
  }, [file])

  useEffect(() => { loadFileContent() }, [loadFileContent])

  if (!file) return <div className="file-preview-empty">请选择一个文件进行预览</div>
  if (isLoading) return <div className="file-preview-loading">加载中...</div>
  if (error) return <div className="file-preview-error">{error}</div>

  if (isImage(file.name)) {
    return (
      <div className="file-preview-image"><img src={content} alt={file.name} /></div>
    )
  }

  if (isCode(file.name) || isText(file.name)) {
    const lang = languageOf(file.name)
    const lines = content.split('\n')
    const truncated = meta.truncated || lines.length > MAX_LINES
    const display = truncated ? lines.slice(0, MAX_LINES).join('\n') + '\n...（已截断预览）' : content
    return (
      <div className="file-preview-code">
        <SyntaxHighlighter language={lang} style={oneDark} wrapLongLines>{display}</SyntaxHighlighter>
      </div>
    )
  }

  return <div className="file-preview-unsupported">不支持预览此文件类型</div>
}
```

### 6.5 样式（微调）
- 现有样式基本可复用；如需：.file-preview-code 内去掉内层 pre 的边框，与主题相协调。

### 6.6 测试（示例）
文件：src/components/__tests__/FilePreview.highlight.test.jsx

```javascript
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { FilePreview } from '../FilePreview'

const mockElectronAPI = { readFile: jest.fn() }
Object.defineProperty(window, 'electronAPI', { value: mockElectronAPI, writable: true })

describe('FilePreview syntax highlight', () => {
  beforeEach(() => jest.clearAllMocks())

  it('高亮显示 JS 代码', async () => {
    mockElectronAPI.readFile.mockResolvedValue({ type: 'text', content: 'function hi(){}' })
    render(<FilePreview file={{ name: 'a.js', path: '/a.js', type: 'file' }} />)
    await waitFor(() => {
      // Prism 渲染后会在内部 code 上附加 language-javascript 类
      const code = document.querySelector('code.language-javascript')
      expect(code).toBeTruthy()
      expect(code.textContent).toMatch('function hi()')
    })
  })

  it('显示图片 data URL', async () => {
    const dataUrl = 'data:image/png;base64,AAAA'
    mockElectronAPI.readFile.mockResolvedValue({ type: 'image', content: dataUrl })
    render(<FilePreview file={{ name: 'a.png', path: '/a.png', type: 'file' }} />)
    const img = await screen.findByRole('img')
    expect(img).toHaveAttribute('src', dataUrl)
  })
})
```

文件：src/main/__tests__/ipcHandlers.readFileBinary.test.js

```javascript
/** @jest-environment node */
const handlers = {}
const fsMocks = { readFile: jest.fn(), stat: jest.fn(), open: jest.fn(), }

jest.mock('fs/promises', () => ({
  readFile: (...a) => fsMocks.readFile(...a),
  stat: (...a) => fsMocks.stat(...a),
  open: (...a) => fsMocks.open(...a),
}))

jest.mock('electron', () => ({ ipcMain: { handle: jest.fn((ch, fn) => { handlers[ch] = fn }) } }))

describe('read-file binary', () => {
  beforeEach(() => { Object.keys(handlers).forEach(k => delete handlers[k]); jest.resetModules() })

  it('图片返回 data URL', async () => {
    const { registerIpcHandlers } = require('../../main/ipcHandlers')
    fsMocks.stat.mockResolvedValue({ size: 100 })
    fsMocks.readFile.mockResolvedValue(Buffer.from('fff', 'hex'))
    registerIpcHandlers()
    const res = await handlers['read-file'](null, '/a.png')
    expect(res.type).toBe('image')
    expect(res.content.startsWith('data:image/png;base64,')).toBe(true)
  })
})
```

---

## 7. 顺序与依赖
1) 安装依赖 → 2) 编写失败测试（组件 + IPC）→ 3) 实现 IPC 二进制/大小阈值 → 4) 实现 preload 向后兼容接口 → 5) 实现 FilePreview 语法高亮与截断 → 6) 修复测试通过 → 7) 重构与样式微调 → 8)（可选）E2E 场景。

---

## 8. 边界与考虑
- 大文件：设置阈值，文本截断、图片不预览；
- 编码：默认 utf-8，后续可用 chardet + iconv-lite 做编码探测与解码；
- 二进制：未知类型文件显示“不支持预览”；
- Markdown：默认作为文本；如开启 react-markdown，需禁用原始 HTML（remark-gfm，无 rehype-raw）。
- 性能：语法高亮对超大文件成本高，已通过截断控制；
- 安全：预览区不执行脚本、不渲染外链；
- 向后兼容：preload/readFile 允许旧签名继续工作（renderer 侧做兼容识别）。

---

## 9. 提交与 CI
- 典型提交切分：
  - feat(ipc): read-file 支持图片与大小阈值 + 单测
  - feat(preload): readFile 支持 options（兼容旧签名）+ 单测
  - feat(preview): 集成 react-syntax-highlighter + 单测
  - chore(style): 预览区样式微调
  - test(e2e): 预览 E2E 场景

- 运行：
```bash
npm run test
npm run test:e2e # 如添加 E2E
npm run dev
```

---

## 10. 备选方案与迁移路径
- 如需更强能力（折叠、跳转、占位渲染、超大文件流式预览），可切换 Monaco/CodeMirror：
  - 使用 @monaco-editor/react + vite-plugin-monaco-editor，Electron 需配置 Worker 路径；
  - 保持 languageMapping 与 isImage/isText 判定不变，渲染层替换为 Monaco 只读模式；
  - 单测中 mock Monaco 组件。

---

完成标准：所有新增测试通过；预览区可正确显示主流语言代码（语法高亮）、文本和常见图片；对大文件/不支持类型给出明确提示；无安全风险；文档（本文）落地到 docs/ 目录。
