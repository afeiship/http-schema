# http-schema Monorepo 重构 + Example 项目设计

> 日期：2026-08-08
> 状态：已批准

## 目标

将 `http-schema` 重构为标准 pnpm monorepo，并把 React + Vite 示例项目加入 `apps/` 目录。通过 pnpm workspace 引用本地 `@jswork/http-schema` 源码，展示完整的 CRUD 调用流程。

## 技术栈

- React 18 + TypeScript
- Vite 5
- json-server（mock REST API）
- `@jswork/http-schema`（workspace 引用）
- `@jswork/universal-request-adapter-fetch`

## 项目结构

```
http-schema/
├── pnpm-workspace.yaml
├── package.json                    # 根编排脚本
├── README.md / llms.txt / LICENSE.txt
├── docs/
│   └── superpowers/
│       ├── specs/
│       └── plans/
├── packages/
│   └── http-schema/                # 原根目录代码搬到这里
│       ├── package.json            # @jswork/http-schema
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       ├── src/
│       │   ├── index.ts
│       │   ├── types.ts
│       │   ├── parser.ts
│       │   └── rest.ts
│       ├── __tests__/
│       │   ├── index.spec.ts
│       │   ├── parser.spec.ts
│       │   ├── rest.spec.ts
│       │   └── types.spec.ts
│       └── dist/                   # 构建产物
├── apps/
│   └── example/                    # React Vite 示例
│       ├── package.json
│       ├── index.html
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── schema.ts
│       │   ├── api.ts
│       │   └── components/
│       │       └── ApiCard.tsx
│       └── server/
│           └── db.json
```

## 数据流

```
vite dev (5173)
  ├─ json-server (3001)    ← API 请求
  └─ React App (5173)
       ├─ schema.ts → httpSchema → api 实例
       ├─ 页面展示 API 列表
       └─ 点击按钮 → api.key(data) → fetch → json-server → 渲染
```

## 关键文件

### pnpm-workspace.yaml

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

### 根 package.json

```json
{
  "name": "http-schema-monorepo",
  "private": true,
  "scripts": {
    "build": "pnpm --filter @jswork/http-schema build",
    "test": "pnpm --filter @jswork/http-schema test",
    "example": "pnpm --filter example dev"
  }
}
```

### packages/http-schema/package.json

保持现有 `@jswork/http-schema` 的 `package.json` 不变，路径变为 `packages/http-schema/`。

### apps/example/schema.ts

模拟真实 project 的 DSL 配置，包含：
- 全局 baseURL `http://localhost:3001/api`
- 2 个分组：admin（login/profile）和 resources（badges/posts 等 CRUD + 自定义接口）
- path 占位符 `{id}`
- 自定义 meta（tags）

### apps/example/api.ts

```typescript
import httpSchema from '@jswork/http-schema';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';
import schema from './schema';

const api = httpSchema(schema, {
  adapter: new FetchAdapter(),
  transformResponse: (res) => res.data,
});

export default api;
```

### apps/example/server/db.json

```json
{
  "badges": [
    { "id": 1, "name": "Gold", "icon": "🥇" },
    { "id": 2, "name": "Silver", "icon": "🥈" }
  ],
  "posts": [
    { "id": 1, "title": "Hello World", "body": "First post" }
  ],
  "categories": [
    { "id": 1, "name": "Tech", "root": true }
  ]
}
```

### apps/example/vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
```

### App 页面布局

- 顶部标题 + 说明
- 按分组展示 API 卡片列表
- 每个卡片：函数名、method 标签、路径、调用按钮
- 点击卡片发送请求，下方展示 JSON 响应

## 根配置变更

### 根 package.json

```json
{
  "name": "http-schema-monorepo",
  "private": true,
  "scripts": {
    "build": "pnpm --filter @jswork/http-schema build",
    "test": "pnpm --filter @jswork/http-schema test",
    "example": "pnpm --filter example dev"
  }
}
```

## 启动方式

```bash
# 安装依赖
pnpm install

# 构建 http-schema
pnpm build

# 启动 example（同时启动 vite + json-server）
pnpm example
```

## 迁移步骤

1. 在根目录创建 `pnpm-workspace.yaml`
2. 创建 `packages/` 目录，将 `src/`, `__tests__/`, `tsconfig.json`, `tsup.config.ts`, `package.json` 移入 `packages/http-schema/`
3. 创建 `packages/http-schema/.gitignore`（dist/ 等）
4. 更新根 `package.json` 为 private orchestration
5. 创建 `apps/example/` 目录及所有文件
6. 更新 `README.md` 和 `llms.txt` 中的路径

## 文件清单

| 文件 | 说明 |
|------|------|
| `pnpm-workspace.yaml` | workspace 配置 |
| `package.json` | 根编排脚本（private） |
| `packages/http-schema/package.json` | @jswork/http-schema 子包 |
| `packages/http-schema/src/` | 源码 |
| `packages/http-schema/__tests__/` | 测试 |
| `packages/http-schema/tsconfig.json` | TS 配置 |
| `packages/http-schema/tsup.config.ts` | 构建配置 |
| `apps/example/package.json` | 示例子包依赖 + 脚本 |
| `apps/example/index.html` | Vite 入口 HTML |
| `apps/example/vite.config.ts` | Vite 配置（proxy） |
| `apps/example/tsconfig.json` | TypeScript 配置 |
| `apps/example/src/main.tsx` | React 入口 |
| `apps/example/src/App.tsx` | 主页面 |
| `apps/example/src/schema.ts` | DSL 配置 |
| `apps/example/src/api.ts` | httpSchema 实例化 |
| `apps/example/src/components/ApiCard.tsx` | API 调用卡片 |
| `apps/example/server/db.json` | json-server 数据 |