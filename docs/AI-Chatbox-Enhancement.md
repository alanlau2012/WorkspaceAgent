## AI 聊天框功能完善方案（TDD 驱动）

本文档描述本项目中 AI 聊天框的功能完善方案，采用测试驱动开发（TDD）方式实施，覆盖服务层、状态层与 UI 层的改造与新增，明确验收标准与风险控制。

### 1. 背景与目标
- 现状：聊天面板已有模型下拉与发送流程，但模型来源为固定静态列表，无法扩展自定义模型。
- 目标：
  - 支持在渲染层添加自定义模型（名称/ID、类型、Base URL、API Key/Headers、默认模型名等），初版以 Mock Provider 调试。
  - 模型即时注册到 `llmClient`，`ChatPanel` 的模型下拉可选择新模型并打通发送逻辑。
  - 支持删除/禁用自定义模型（基础管理）。
  - 本地持久化（`localStorage`），后续可迁移主进程配置文件。
- 不在本次范围：
  - 真实 MaaS HTTP 调用与流式输出（保留模拟）。
  - 复杂鉴权流程与团队共享（后续迭代）。

### 2. 现状概览（关键点）
- `ChatPanel` 模型选择器来自 `store` 的 `availableModels/selectedModel`。
- `chatStore` 的可用模型为静态列表，通过 `llmClient.sendMessage` 发送。
- `llmClient` 使用固定 providers 集合，暂无注册/注销能力。

### 3. 架构与数据流
- 服务层（`services`）
  - 在 `llmClient` 增加：
    - `registerModel(id, provider)`、`unregisterModel(id)`、`hasModel(id)`、`updateModel(id, provider)`；
    - `sendMessage({ model, messages, context, config })` 透传 `config`；
    - `getAvailableModels()` 返回 `{ id, name }[]`。
  - 新增 `maasMockProvider` 工厂：
    - 输入自定义模型配置（`name/baseUrl/model/apiKey/headers/...`），产出 `{ name, sendMessage }` 的 provider；
    - `sendMessage` 模拟网络延迟与可预期回复，包含 `usage` 字段。
- 状态层（`stores`）
  - `chatStore` 增加 `customModels[]`、持久化与同步：
    - `initModelsFromStorage()`：加载本地配置，注册到 `llmClient`；
    - `addCustomModel(cfg)`、`removeCustomModel(id)`、`updateCustomModel(id, partial)`、`syncAvailableModels()`；
    - `availableModels` 不再写死，由 `llmClient.getAvailableModels()` 生成；
    - `selectedModel` 若被删除，回退到默认 `mock-echo`。
- UI 层（`components`）
  - 新增 `ChatModelManager`（弹窗/抽屉）：
    - 列出自定义模型，表单添加/编辑（ID 唯一、名称、类型、Base URL、默认模型、API Key、Headers JSON）；
    - 保存后注册并写入 store，可测试一条消息（使用 mock 返回）。
  - 修改 `ChatPanel`：在模型选择器旁新增“➕ 模型”按钮，打开管理器；保存后刷新下拉可选项。

### 4. API 设计（渲染层内部，不走 IPC）
- `llmClient`：
  - `registerModel(id, provider)`
  - `unregisterModel(id)`
  - `hasModel(id)` / `isModelAvailable(id)`
  - `getAvailableModels(): {id,name}[]`
  - `sendMessage({ model, messages, context, config })`
- `maasMockProvider`：
  - `create(config) -> provider`
- `chatStore`：
  - `initModelsFromStorage()`
  - `addCustomModel(config)`
  - `removeCustomModel(id)`
  - `updateCustomModel(id, partial)`
  - `syncAvailableModels()`

示例 Provider（Mock）：
```js
export function createMaasMockProvider(config) {
  const name = config?.name || 'Custom MaaS Mock'
  return {
    name,
    async sendMessage({ messages }) {
      await new Promise(r => setTimeout(r, 400 + Math.random()*600))
      const last = messages[messages.length - 1]
      const base = config?.baseUrl || 'mock://maas'
      const model = config?.model || 'mock-model'
      return {
        content: `[${name}](${base}/${model}) -> ${last?.content ?? ''}`,
        model: config?.id || 'custom-maas',
        usage: { tokens: String(last?.content || '').length }
      }
    }
  }
}
```

### 5. 数据模型与持久化
- `customModels` 存储结构（`localStorage` 中的 `customModels`）：
```json
[
  {
    "id": "maas-dev",
    "name": "MaaS Mock",
    "type": "mock",
    "baseUrl": "mock://maas",
    "model": "demo",
    "apiKey": "",
    "headers": {"X-Trace": "on"},
    "disabled": false
  }
]
```
- 初始化：应用启动时 `initModelsFromStorage()` → 为每条配置创建并注册 provider → 刷新 `availableModels`。
- 更新：`add/update/remove` 后同步写入 `localStorage` 并 `syncAvailableModels()`。

### 6. 交互与 UI 说明
- `ChatPanel`
  - 模型选择器旁新增“➕ 模型”按钮，打开 `ChatModelManager`。
  - 切换模型时若模型被禁用或不存在，保持原值或回退至 `mock-echo`。
- `ChatModelManager`
  - 表单字段：
    - ID（必填，唯一）、显示名称（必填）、类型（Mock/MaaS）、Base URL、默认模型名、API Key（可选）、Headers（JSON 文本框）；
  - 验证：
    - ID/名称必填；重复 ID：当前策略 upsert（覆盖更新），如需严格唯一可在 UI 阻止并提示；
    - Headers 非法 JSON 显示错误；
  - 列表：展示现有自定义模型，提供删除按钮；
  - 测试发送：可选，调用 provider 返回模拟响应以校验配置。

### 7. TDD 分解与测试清单
- 服务层（Jest）
  - 新增：`src/services/__tests__/llmClient.custom.test.js`
    - register/unregister/has/update 行为；重复 ID 采用“存在则更新”；
    - 使用 `maasMockProvider` 注册模型并发送消息，断言返回包含模型名/回显特征且存在 `usage`；
    - 未知模型抛错保持不变。
- 状态层（Jest）
  - 新增：`src/stores/__tests__/chatStore.customModel.test.js`
    - `initModelsFromStorage` 载入后 `availableModels` 包含自定义模型；
    - `addCustomModel` 后 `availableModels` 更新；
    - `removeCustomModel` 后 `selectedModel` 回退到 `mock-echo`；
    - 选中自定义模型后 `sendMessage` 走该 provider（可 spy 注册 provider）。
- 组件层（@testing-library/react）
  - 新增：`src/components/Chat/__tests__/ChatModelManager.test.jsx`
    - 点击 `ChatPanel` 中“➕ 模型”打开对话框；
    - 填写表单并保存 → 调用 `store.addCustomModel`，新模型出现在下拉框；
    - 重复 ID/非法 JSON 错误提示；
  - 更新：`ChatPanel` 测试，新增按钮存在；添加模型后能选择并用于发送。

### 8. 实施步骤（严格 TDD）
1) 服务层增强（先写失败测试，再最小实现 → 重构）
   - 修改 `src/services/llmClient.js`：新增注册/注销/更新能力；`sendMessage` 透传 `config`；`getAvailableModels` 返回 `name`；
   - 新增 `src/services/maasMockProvider.js`；
   - 新增 `src/services/__tests__/llmClient.custom.test.js`。
2) 状态层扩展
   - 修改 `src/stores/chatStore.js`：移除静态模型，新增 `customModels` 与 actions 与持久化；
   - 新增 `src/stores/__tests__/chatStore.customModel.test.js`。
3) UI 组件
   - 新增 `src/components/Chat/ChatModelManager.jsx` 与样式；
   - 修改 `src/components/Chat/ChatPanel.jsx`：新增入口按钮与管理器挂载；
   - 新增/更新组件测试。
4) 回归与持久化验证
   - 启动应用，手动添加模型并发送消息验证；
   - 覆盖边界：删除选中模型、非法 JSON、重复 ID 等。

### 9. 验收标准（DoD）
- 单元测试：
  - `llmClient` 自定义注册/注销/发送用例通过；
  - `chatStore` 自定义模型增删改、`selectedModel` 回退逻辑通过；
- 组件测试：
  - `ChatModelManager` 表单交互、错误校验、保存与删除操作通过；
  - `ChatPanel` 新按钮存在，添加模型后可选择并用于发送；
- 手动验证：
  - 添加 ID=`maas-dev`、名称=`MaaS Mock`、Base URL=`mock://maas`、默认模型=`demo`；
  - 发送消息时返回形如：`[MaaS Mock](mock://maas/demo) -> <消息>`。

### 10. 边界与考虑
- 重复 ID：采用 upsert 策略（覆盖更新），可在 UI 层改为严格唯一。
- 删除行为：若删除的是当前选中模型，自动回退 `selectedModel` 为 `mock-echo`。
- 安全性：API Key 暂存 `localStorage`；生产应迁移主进程安全存储，UI 不回显明文。
- 性能：模型数量通常较少，注册与渲染 O(n) 可接受。
- 国际化：按钮与错误提示预留 i18n，后续接入。

### 11. 发布与回滚
- 发布：合并后运行全部测试（单测/组件/E2E 如有）；构建通过后发布。
- 回滚：若出现持久化/渲染异常，可暂时禁用自定义模型入口，保留默认 `mock-echo` 与 `mock-assistant`。

### 12. 文件清单（新增/修改）
- 新增：
  - `src/services/maasMockProvider.js`
  - `src/services/__tests__/llmClient.custom.test.js`
  - `src/stores/__tests__/chatStore.customModel.test.js`
  - `src/components/Chat/ChatModelManager.jsx`
  - `src/components/Chat/ChatModelManager.css`
  - `src/components/Chat/__tests__/ChatModelManager.test.jsx`
- 修改：
  - `src/services/llmClient.js`（注册/注销/更新能力）
  - `src/stores/chatStore.js`（`customModels` 与 actions、`availableModels` 同步）
  - `src/components/Chat/ChatPanel.jsx`（新增按钮、挂载管理器）
  - `src/components/Chat/ChatPanel.css`（样式微调）

### 13. 附录：示例用法
- 注册与发送（示意）：
```js
import { llmClient } from '@/services/llmClient'
import { createMaasMockProvider } from '@/services/maasMockProvider'

llmClient.registerModel('maas-dev', createMaasMockProvider({
  id: 'maas-dev',
  name: 'MaaS Mock',
  baseUrl: 'mock://maas',
  model: 'demo'
}))

const res = await llmClient.sendMessage({
  model: 'maas-dev',
  messages: [{ role: 'user', content: '你好' }]
})
// 期望：res.content === "[MaaS Mock](mock://maas/demo) -> 你好"
```
