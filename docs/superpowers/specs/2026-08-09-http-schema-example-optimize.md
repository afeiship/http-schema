# http-schema: example 优化设计

日期：2026-08-09

## 背景与目标

当前 example demo 的 schema 展开 4 个 resources（badges、posts、categories、tags）共 20 个 CRUD 接口 + 3 个自定义接口，卡片过多、杂乱。UI 使用大量内联样式，难以维护。interceptor 的触发虽然用了 tags，但 UI 上没有向用户展示每个接口会被哪些 interceptor 处理。

**目标**：
1. 添加 Tailwind v4，重构 UI 样式
2. 精简 demo 的 API 数量
3. 在 UI 卡片上展示每个接口被哪些 interceptor 处理（tag 标识）

## 设计

### 1. Schema 精简

`apps/example/src/schema.ts` 精简为 13 个接口：`badges` CRUD（5）+ `categories` CRUD（5）+ 3 个自定义接口。

```typescript
export default {
  baseURL: '/api',
  request: ['', 'json'],
  items: [
    {
      resources: ['badges', 'categories'],
    },
    {
      request: ['', 'json'],
      prefix: 'v1_',
      items: {
        me: ['get', '/me'],
        categories_root: ['get', '/categories/root', { tags: ['paginate'] }],
        badges_top: ['get', '/badges/top', { tags: ['paginate'], meta: { pageSize: 3 } }],
      },
    },
  ],
} as any;
```

去掉 `posts`、`tags` 两个 resource。

### 2. Tailwind v4 集成

- `package.json` 添加 devDependencies：`tailwindcss`、`@tailwindcss/vite`
- `vite.config.ts` 添加 `tailwindcss()` 插件
- 新建 `src/index.css`，内容仅 `@import "tailwindcss";`
- `main.tsx` 引入 `import './index.css'`

### 3. App.tsx 重构

将所有内联 `style={}` 替换为 Tailwind class。页面结构：标题 + 接口卡片网格，所有接口平铺展示。

**UI tag 标识**：在 App.tsx 硬编码一个「接口名 → interceptor 标签」映射表：

```typescript
const API_BADGES: Record<string, string[]> = {
  badges_top: ['paginate'],
  categories_root: ['paginate'],
  v1_categories_root: ['by-name'],
};
```

渲染时，每个卡片根据接口名查映射表，显示对应标签。无标签的接口不显示任何标签。

**卡片内容**：
- 接口名（id）
- HTTP method 标签（GET/POST/PUT/DELETE，从函数名推断）
- Interceptor 标签（从 `API_BADGES` 查）
- Call 按钮
- 响应 JSON 预览

### 4. 不改动的文件

- `api.ts` — 不变
- `interceptors/` 目录 — 不变（`by-name.ts` 已改为读取 `config.id`）
- `packages/core` — 不变

## 测试

- example 项目 `bun run build` 可通过（tsc + vite build）
- 运行 `bun run dev` 手动验证页面正常渲染、接口可调用、标签正确显示

## 未纳入范围

- 不修改 core 包逻辑
- 不改 interceptor 实现
- 不做响应折叠/展开等复杂交互
- 不添加 Tab 导航分组