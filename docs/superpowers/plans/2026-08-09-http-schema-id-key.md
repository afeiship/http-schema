# ApiItem 重构 — name 改 id，新增 key 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `ApiItem.name` 更名为 `id`，新增 `key` 字段记录原始 schema key，并同步注入到 RequestConfig。

**Architecture:** 纯类型重命名 + 字段新增，不涉及逻辑变更。parser 解析时记录原始 key，index 构建 config 时同时注入 name（从 id 取）和 key。

**Tech Stack:** TypeScript, Bun test

---

### Task 1: 更新 ApiItem 类型定义

**Files:**
- Modify: `packages/core/src/types.ts:47-54`

- [ ] **Step 1: 修改 ApiItem 接口**

将 `name: string` 改为 `id: string`，新增 `key: string`：

```typescript
// 解析后的扁平接口项
export interface ApiItem {
  id: string;
  key: string;
  method: string;
  fullPath: string;
  dataType: DataType;
  baseURL: string;
  config?: Partial<RequestConfig>;
}
```

- [ ] **Step 2: 运行编译检查**

```bash
cd packages/core && bun run tsc --noEmit
```
Expected: 编译通过（或报 name 相关错误，因为其他文件还在用 `name`，后续任务会逐步修复）

- [ ] **Step 3: 提交**

```bash
git add packages/core/src/types.ts
git commit -m "refactor(types): rename ApiItem.name to id, add key field"
```

---

### Task 2: 更新 parser — 解析时记录原始 key

**Files:**
- Modify: `packages/core/src/parser.ts:71-86`

- [ ] **Step 1: 修改叶子节点解析逻辑**

将 `key` 重命名为 `rawKey`，`name` 改为 `id`，新增 `key: rawKey`：

```typescript
Object.entries(items).forEach(([rawKey, leaf]) => {
  const [method, path, leafConfig] = leaf as HttpSchemaLeaf;
  const id = ctx.namePrefix + rawKey + ctx.nameSuffix;
  const fullPath = joinPaths(ctx.prefix, path);
  const mergedConfig = leafConfig
    ? { ...ctx.config, ...leafConfig }
    : ctx.config;
  result.push({
    id,
    key: rawKey,
    method: method.toLowerCase(),
    fullPath,
    dataType: ctx.dataType,
    baseURL: ctx.baseURL,
    config: mergedConfig,
  });
});
```

- [ ] **Step 2: 运行编译检查**

```bash
cd packages/core && bun run tsc --noEmit
```
Expected: 编译通过（或其他文件报错，逐步修复）

- [ ] **Step 3: 提交**

```bash
git add packages/core/src/parser.ts
git commit -m "refactor(parser): record rawKey, rename name to id in ApiItem"
```

---

### Task 3: 更新 index — RequestConfig 注入 id 和 key

**Files:**
- Modify: `packages/core/src/index.ts:92-100`

- [ ] **Step 1: 修改 RequestConfig 构建逻辑**

```typescript
const config: RequestConfig = {
  url: resolvedPath,
  method: item.method.toUpperCase() as any,
  baseURL: item.baseURL || undefined,
  dataType: (options?.dataType ?? item.dataType) as any,
  name: item.id,
  key: item.key,
  ...item.config,
  ...callOptions,
};
```

- [ ] **Step 2: 运行编译检查**

```bash
cd packages/core && bun run tsc --noEmit
```
Expected: 编译通过

- [ ] **Step 3: 提交**

```bash
git add packages/core/src/index.ts
git commit -m "refactor(core): inject name from item.id, add key to RequestConfig"
```

---

### Task 4: 更新 parser 测试

**Files:**
- Modify: `packages/core/__tests__/parser.spec.ts`

- [ ] **Step 1: 更新所有 `name` 引用为 `id`，新增 `key` 断言**

逐行替换 `result[0].name` → `result[0].id`，`result[0].name` → `result[0].id`，`result.find(r => r.name` → `result.find(r => r.id`，并在断言处新增 `key` 检查：

```typescript
// 第 18-23 行
expect(result[0].id).toBe('ping');
expect(result[0].key).toBe('ping');
expect(result[0].method).toBe('get');
expect(result[0].fullPath).toBe('/api/ping');
expect(result[0].dataType).toBe('json');
expect(result[0].baseURL).toBe('http://test.com');

expect(result[1].id).toBe('echo');
expect(result[1].key).toBe('echo');
expect(result[1].method).toBe('post');
expect(result[1].fullPath).toBe('/api/echo');
expect(result[1].config).toEqual({ tags: ['test'] });
```

```typescript
// 第 45 行
expect(result[0].id).toBe('user');
expect(result[0].key).toBe('user');
```

```typescript
// 第 65 行
expect(result.find(r => r.id === 'tags_top')).toBeDefined();
expect(result.find(r => r.id === 'tags_index')).toBeDefined();
```

```typescript
// 第 84 行
expect(result[0].id).toBe('admin_dashboardV2');
expect(result[0].key).toBe('dashboard');
```

```typescript
// 第 101 行
expect(result[0].baseURL).toBe('http://other.com');
```

```typescript
// 第 142-143 行
expect(result.find(r => r.id === 'admin_tags_indexV2')).toBeDefined();
expect(result.find(r => r.id === 'admin_tags_topV2')).toBeDefined();
// 不应该出现双重应用
expect(result.find(r => r.id === 'admin_admin_tags_indexV2V2')).toBeUndefined();
```

```typescript
// 第 163 行
expect(result[0].config).toEqual({
```

- [ ] **Step 2: 运行测试**

```bash
cd packages/core && bun test __tests__/parser.spec.ts
```
Expected: 全部 PASS

- [ ] **Step 3: 提交**

```bash
git add packages/core/__tests__/parser.spec.ts
git commit -m "test(parser): update tests for ApiItem.id and ApiItem.key"
```

---

### Task 5: 更新 index 测试

**Files:**
- Modify: `packages/core/__tests__/index.spec.ts`

- [ ] **Step 1: 更新 name 注入测试，新增 key 断言**

第 112-128 行，注入 name 测试中新增 `key` 断言：

```typescript
it('should inject name and key into request config', async () => {
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
  expect(adapter.lastConfig?.key).toBe('categories_root');

  await api.badges_top();
  expect(adapter.lastConfig?.name).toBe('badges_top');
  expect(adapter.lastConfig?.key).toBe('badges_top');
});
```

第 130-142 行，callOptions 覆盖测试中验证 key 不受影响：

```typescript
it('should allow callOptions to override name and key', async () => {
  const adapter = new CaptureAdapter();
  const config: HttpSchemaConfig = {
    baseURL: 'http://test.com',
    request: ['/api', 'json'],
    items: {
      ping: ['get', '/ping'],
    }
  };
  const api = httpSchema(config, { adapter });
  await api.ping(null, { name: 'custom_name', key: 'custom_key' });
  expect(adapter.lastConfig?.name).toBe('custom_name');
  expect(adapter.lastConfig?.key).toBe('custom_key');
});
```

- [ ] **Step 2: 运行测试**

```bash
cd packages/core && bun test
```
Expected: 全部 PASS

- [ ] **Step 3: 提交**

```bash
git add packages/core/__tests__/index.spec.ts
git commit -m "test(core): add key assertion for RequestConfig injection"
```

---

### Task 6: 全量验证

**Files:** 无

- [ ] **Step 1: 运行全部测试**

```bash
cd packages/core && bun test
```
Expected: 全部 PASS

- [ ] **Step 2: 编译检查**

```bash
cd packages/core && bun run tsc --noEmit
```
Expected: 编译通过，无错误

- [ ] **Step 3: 检查 example 是否能正常编译**

```bash
cd apps/example && bun run tsc --noEmit
```
Expected: 编译通过（example 不直接引用 ApiItem，应无影响）

- [ ] **Step 4: 提交最终调整（如有）**

```bash
git add -A
git commit -m "chore: finalize ApiItem id/key refactor"
```