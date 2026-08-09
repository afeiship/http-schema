# Example 优化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 精简 example schema、集成 Tailwind v4、添加 UI interceptor 标签

**Architecture:** 纯前端改动，不涉及 core 包。Tailwind v4 通过 @tailwindcss/vite 插件集成，UI 标签用硬编码映射表展示。

**Tech Stack:** Vite + React 18 + Tailwind v4

---

### Task 1: 安装 Tailwind v4 依赖

**Files:**
- Modify: `apps/example/package.json`

- [ ] **Step 1: 安装 tailwindcss 和 @tailwindcss/vite**

```bash
cd /Users/afei/github/http-schema/apps/example && pnpm add tailwindcss @tailwindcss/vite -D
```

- [ ] **Step 2: 提交**

```bash
git add apps/example/package.json apps/example/pnpm-lock.yaml
git commit -m "chore(example): add tailwindcss v4 and @tailwindcss/vite"
```

---

### Task 2: 配置 Tailwind v4（Vite 插件 + CSS 入口）

**Files:**
- Modify: `apps/example/vite.config.ts`
- Create: `apps/example/src/index.css`
- Modify: `apps/example/src/main.tsx`

- [ ] **Step 1: vite.config.ts 添加 tailwindcss 插件**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
```

- [ ] **Step 2: 创建 src/index.css**

```css
@import "tailwindcss";
```

- [ ] **Step 3: main.tsx 引入 CSS 文件**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 4: 验证构建**

```bash
cd /Users/afei/github/http-schema/apps/example && bun run tsc --noEmit
```
Expected: 编译通过

- [ ] **Step 5: 提交**

```bash
git add apps/example/vite.config.ts apps/example/src/index.css apps/example/src/main.tsx
git commit -m "feat(example): configure tailwind v4 with @tailwindcss/vite plugin"
```

---

### Task 3: 精简 schema

**Files:**
- Modify: `apps/example/src/schema.ts`

- [ ] **Step 1: 精简 schema 为 badges + categories + 3 个自定义接口**

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

- [ ] **Step 2: 验证 core 包测试仍通过（schema 改动不影响 core）**

```bash
cd /Users/afei/github/http-schema/packages/core && bun test
```
Expected: 30 pass, 0 fail

- [ ] **Step 3: 提交**

```bash
git add apps/example/src/schema.ts
git commit -m "refactor(example): simplify schema to badges + categories + custom apis"
```

---

### Task 4: 重构 App.tsx — Tailwind 样式 + UI 标签

**Files:**
- Modify: `apps/example/src/App.tsx`

- [ ] **Step 1: 完整重写 App.tsx**

```tsx
import { useState } from 'react';
import api from './api';

const API_NAMES = Object.keys(api);

// Interceptor 标签映射（硬编码，与 schema 和 interceptor 配置保持同步）
const API_BADGES: Record<string, string[]> = {
  v1_badges_top: ['paginate'],
  v1_categories_root: ['paginate', 'by-name'],
};

const TAG_COLORS: Record<string, string> = {
  paginate: 'bg-blue-100 text-blue-700',
  'by-name': 'bg-orange-100 text-orange-700',
};

function methodOf(name: string): string {
  const action = name.split('_').pop();
  switch (action) {
    case 'create': return 'POST';
    case 'update': return 'PUT';
    case 'destroy': return 'DELETE';
    default: return 'GET';
  }
}

function callArgs(name: string): any {
  const action = name.split('_').pop();
  switch (action) {
    case 'show': return { id: 1 };
    case 'create': return { name: 'New Item' };
    case 'update': return { id: 1, name: 'Updated Item' };
    case 'destroy': return { id: 1 };
    default: return undefined;
  }
}

function App() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<string | null>(null);

  const callApi = async (name: string) => {
    setLoading(name);
    try {
      const fn = api[name];
      const res = await fn(callArgs(name));
      setResults((prev) => ({ ...prev, [name]: res }));
    } catch (err: any) {
      setResults((prev) => ({ ...prev, [name]: { error: err.message } }));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 font-sans max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">http-schema Example</h1>
      <p className="text-gray-500 text-sm mb-4">
        Click any API function to call it. Responses are fetched from json-server via fetch adapter.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {API_NAMES.map((name) => {
          const badges = API_BADGES[name] ?? [];
          const method = methodOf(name);
          const result = results[name];

          return (
            <div
              key={name}
              className={`border border-gray-200 rounded-lg p-4 ${loading === name ? 'bg-gray-50' : 'bg-white'}`}
            >
              <div className="font-semibold mb-2 text-sm flex items-center gap-2 flex-wrap">
                {name}
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-sky-500 text-white font-medium">
                  {method}
                </span>
                {badges.map((tag) => (
                  <span
                    key={tag}
                    className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${TAG_COLORS[tag] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <button
                onClick={() => callApi(name)}
                disabled={loading === name}
                className="px-4 py-1.5 rounded border border-sky-500 text-sm font-medium cursor-pointer disabled:cursor-not-allowed disabled:bg-sky-50 disabled:text-sky-300 disabled:border-sky-200 bg-sky-500 text-white hover:bg-sky-600 active:bg-sky-700"
              >
                {loading === name ? 'Loading...' : 'Call'}
              </button>

              {result && (
                <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-48 border border-gray-100">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd /Users/afei/github/http-schema/apps/example && bun run tsc --noEmit
```
Expected: 编译通过

- [ ] **Step 3: 提交**

```bash
git add apps/example/src/App.tsx
git commit -m "feat(example): rewrite with tailwind classes and interceptor tag badges"
```

---

### Task 5: 全量验证

**Files:** 无

- [ ] **Step 1: 检查 example 构建**

```bash
cd /Users/afei/github/http-schema/apps/example && bun run build
```
Expected: 构建成功，无错误

- [ ] **Step 2: 检查 core 包测试仍通过**

```bash
cd /Users/afei/github/http-schema/packages/core && bun test
```
Expected: 30 pass, 0 fail

- [ ] **Step 3: 提交 spec 和 plan 文档**

```bash
cd /Users/afei/github/http-schema && git add docs/superpowers/ && git commit -m "docs: add example optimize spec and plan"
```