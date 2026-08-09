# RequestConfig.name 注入

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 httpSchema 构建的 RequestConfig 中自动注入 `name` 字段，值为接口的 schema key（`item.name`），方便 interceptor 定位当前请求对应哪个接口。

**Architecture:** 在 `packages/core/src/index.ts` 中构建 config 时，在展开 `...item.config` 和 `...callOptions` 之前加入 `name: item.name`。改动仅一行，无需修改类型定义。

**Tech Stack:** TypeScript, bun test

---

### Task 1: 注入 name 到 RequestConfig

**Files:**
- Modify: `packages/core/src/index.ts:91-99`

- [ ] **Step 1: 在 config 对象中注入 name**

修改 `packages/core/src/index.ts`，在构建 config 时加入 `name: item.name`：

```typescript
const config: RequestConfig = {
  url: resolvedPath,
  method: item.method.toUpperCase() as any,
  baseURL: item.baseURL || undefined,
  dataType: (options?.dataType ?? item.dataType) as any,
  name: item.name,
  ...item.config,
  ...callOptions,
};
```

- [ ] **Step 2: 验证现有测试仍然通过**

```bash
cd packages/core && bun test
```

Expected: 所有测试 PASS

- [ ] **Step 3: 提交**

```bash
git add packages/core/src/index.ts
git commit -m "feat: inject name into RequestConfig for interceptor targeting"
```

### Task 2: 添加测试验证 name 注入

**Files:**
- Modify: `packages/core/__tests__/index.spec.ts`

- [ ] **Step 1: 添加测试用例**

在 `packages/core/__tests__/index.spec.ts` 末尾添加：

```typescript
it('should inject name into request config', async () => {
  const adapter = new CaptureAdapter();
  const config: HttpSchemaConfig = {
    baseURL: 'http://test.com',
    request: ['/api', 'json'],
    items: {
      categories_root: ['get', '/categories/root'],
      badges_top: ['get', '/badges/top'],
    }
  };
  const api = httpSchema(config, { adapter });
  await api.categories_root();
  expect(adapter.lastConfig?.name).toBe('categories_root');

  await api.badges_top();
  expect(adapter.lastConfig?.name).toBe('badges_top');
});

it('should allow callOptions to override name', async () => {
  const adapter = new CaptureAdapter();
  const config: HttpSchemaConfig = {
    baseURL: 'http://test.com',
    request: ['/api', 'json'],
    items: {
      ping: ['get', '/ping'],
    }
  };
  const api = httpSchema(config, { adapter });
  await api.ping(null, { name: 'custom_name' });
  expect(adapter.lastConfig?.name).toBe('custom_name');
});
```

- [ ] **Step 2: 运行测试验证**

```bash
cd packages/core && bun test
```

Expected: 所有测试 PASS（包括新增的 2 个）

- [ ] **Step 3: 提交**

```bash
git add packages/core/__tests__/index.spec.ts
git commit -m "test: add test for name injection in request config"
```