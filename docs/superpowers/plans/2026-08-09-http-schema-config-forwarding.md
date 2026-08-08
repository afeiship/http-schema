# RequestConfig 透传实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 DSL 叶子第3个参数直接对应 `RequestConfig`，新增 `HttpSchemaItem.config` 分组级配置，浅合并叶子胜出。

**Architecture:** 修改 3 个核心文件（types.ts / parser.ts / index.ts）实现类型替换和合并逻辑，更新测试和示例项目。

**Tech Stack:** TypeScript, bun test, pnpm workspace

---

### Task 1: 更新类型定义（types.ts）

**Files:**
- Modify: `packages/core/src/types.ts`

- [ ] **Step 1: 修改 `HttpSchemaLeaf` 第3个参数类型**

将 `meta?: Record<string, any>` 改为 `config?: Partial<RequestConfig>`

```typescript
// 修改前
export type HttpSchemaLeaf = [
  method: string,
  path: string,
  meta?: Record<string, any>
];

// 修改后
export type HttpSchemaLeaf = [
  method: string,
  path: string,
  config?: Partial<RequestConfig>
];
```

- [ ] **Step 2: 给 `HttpSchemaItem` 新增 `config` 字段**

```typescript
export interface HttpSchemaItem {
  request?: [string, DataType];
  baseURL?: string;
  prefix?: string;
  suffix?: string;
  config?: Partial<RequestConfig>;   // ← 新增
  resources?: (string | ResourceDef)[];
  items?: HttpSchemaItems;
}
```

- [ ] **Step 3: 修改 `ApiItem` 的 `meta` 为 `config`**

```typescript
export interface ApiItem {
  name: string;
  method: string;
  fullPath: string;
  dataType: DataType;
  baseURL: string;
  config?: Partial<RequestConfig>;  // 之前: meta?: Record<string, any>
}
```

- [ ] **Step 4: 运行测试确认编译通过**

Run: `cd /Users/afei/github/http-schema/packages/core && bun test`
Expected: 编译失败（parser.ts/index.ts 仍引用旧字段）

- [ ] **Step 5: 提交**

```bash
git add packages/core/src/types.ts
git commit -m "feat(types): update HttpSchemaLeaf/HttpSchemaItem/ApiItem for config forwarding"
```

---

### Task 2: 更新解析器（parser.ts）

**Files:**
- Modify: `packages/core/src/parser.ts`

- [ ] **Step 1: 给 `ParseContext` 新增 `config` 字段**

```typescript
interface ParseContext {
  baseURL: string;
  prefix: string;
  dataType: DataType;
  namePrefix: string;
  nameSuffix: string;
  config: Partial<RequestConfig>;  // ← 新增
}
```

- [ ] **Step 2: 更新顶层 `parse` 函数初始化，传入 `config.config`**

```typescript
export function parse(config: HttpSchemaConfig): ApiItem[] {
  if (!config.items) return [];

  const ctx: ParseContext = {
    baseURL: config.baseURL ?? '',
    prefix: config.request?.[0] ?? '',
    dataType: config.request?.[1] ?? 'json',
    namePrefix: '',
    nameSuffix: '',
    config: config.config ?? {},    // ← 新增
  };

  return parseItems(config.items, ctx);
}
```

- [ ] **Step 3: 分组递归时浅合并 `item.config`**

```typescript
// 在 parseItems 的数组分支中，创建 subCtx 后新增：
const subCtx: ParseContext = {
  baseURL: item.baseURL ?? ctx.baseURL,
  prefix: item.request ? joinPaths(ctx.prefix, item.request[0]) : ctx.prefix,
  dataType: item.request?.[1] ?? ctx.dataType,
  namePrefix: item.prefix ?? ctx.namePrefix,
  nameSuffix: item.suffix ?? ctx.nameSuffix,
  config: item.config ? { ...ctx.config, ...item.config } : ctx.config,  // ← 新增
};
```

- [ ] **Step 4: 叶子解析时浅合并 `leafConfig`**

```typescript
// 在 parseItems 的对象分支中，修改叶子解析
const [method, path, leafConfig] = leaf as HttpSchemaLeaf;
const mergedConfig = leafConfig
  ? { ...ctx.config, ...leafConfig }
  : ctx.config;
result.push({
  name,
  method: method.toLowerCase(),
  fullPath: joinPaths(ctx.prefix, path),
  dataType: ctx.dataType,
  baseURL: ctx.baseURL,
  config: mergedConfig,            // 之前: meta,
});
```

- [ ] **Step 5: 运行测试确认编译和已有测试通过**

Run: `cd /Users/afei/github/http-schema/packages/core && bun test`
Expected: 编译通过，但现有测试中 `expect(result[1].meta)` 会失败（因字段名变了）

- [ ] **Step 6: 提交**

```bash
git add packages/core/src/parser.ts
git commit -m "feat(parser): add config merge for groups and leaves"
```

---

### Task 3: 更新入口装配（index.ts）

**Files:**
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: 将 `meta: item.meta` 替换为 `...item.config`**

```typescript
// 修改前
const config: RequestConfig = {
  url: resolvedPath,
  method: item.method.toUpperCase() as any,
  baseURL: item.baseURL || undefined,
  dataType: (options?.dataType ?? item.dataType) as any,
  meta: item.meta,
  ...callOptions,
};

// 修改后
const config: RequestConfig = {
  url: resolvedPath,
  method: item.method.toUpperCase() as any,
  baseURL: item.baseURL || undefined,
  dataType: (options?.dataType ?? item.dataType) as any,
  ...item.config,
  ...callOptions,
};
```

- [ ] **Step 2: 运行测试确认编译通过**

Run: `cd /Users/afei/github/http-schema/packages/core && bun test`
Expected: 编译通过，测试仍会失败（因测试断言仍用旧字段名）

- [ ] **Step 3: 提交**

```bash
git add packages/core/src/index.ts
git commit -m "feat(core): spread item.config into RequestConfig"
```

---

### Task 4: 更新测试

**Files:**
- Modify: `packages/core/__tests__/parser.spec.ts`
- Modify: `packages/core/__tests__/index.spec.ts`

- [ ] **Step 1: 更新 `parser.spec.ts` 中 `meta` → `config` 断言**

```typescript
// 第 27 行
// 之前
expect(result[1].meta).toEqual({ tags: ['test'] });

// 之后
expect(result[1].config).toEqual({ tags: ['test'] });
```

- [ ] **Step 2: 在 `parser.spec.ts` 新增 config 继承测试**

```typescript
it('should merge config from parent group and leaf', () => {
  const config: HttpSchemaConfig = {
    baseURL: 'http://test.com',
    request: ['/api', 'json'],
    items: [{
      config: { timeout: 3000, headers: { 'X-Auth': 'group' } },
      items: {
        foo: ['get', '/foo', { timeout: 5000, meta: { tags: ['paginate'] } }],
      }
    }]
  };
  const result = parse(config);
  expect(result).toHaveLength(1);
  expect(result[0].config).toEqual({
    timeout: 5000,
    headers: { 'X-Auth': 'group' },
    meta: { tags: ['paginate'] },
  });
});

it('should inherit parent config when leaf has no config', () => {
  const config: HttpSchemaConfig = {
    baseURL: 'http://test.com',
    request: ['/api', 'json'],
    items: [{
      config: { timeout: 3000 },
      items: {
        bar: ['get', '/bar'],
      }
    }]
  };
  const result = parse(config);
  expect(result[0].config).toEqual({ timeout: 3000 });
});

it('should handle root-level config', () => {
  const config: HttpSchemaConfig = {
    baseURL: 'http://test.com',
    request: ['/api', 'json'],
    config: { timeout: 1000 },
    items: {
      ping: ['get', '/ping'],
    }
  };
  const result = parse(config);
  expect(result[0].config).toEqual({ timeout: 1000 });
});
```

- [ ] **Step 3: 更新 `index.spec.ts` 中 meta 测试**

保持不变，因为 `index.spec.ts` 的测试 `adapter.lastConfig?.meta` 测试的是最终 RequestConfig 上的 meta 字段，这个字段由 `...item.config` spread 后自然存在，不需要改。

- [ ] **Step 4: 运行所有测试确认通过**

Run: `cd /Users/afei/github/http-schema/packages/core && bun test`
Expected: ALL PASS

- [ ] **Step 5: 提交**

```bash
git add packages/core/__tests__/parser.spec.ts packages/core/__tests__/index.spec.ts
git commit -m "test(parser): update meta→config assertions, add config merge tests"
```

---

### Task 5: 更新示例项目

**Files:**
- Modify: `apps/example/src/schema.ts`

- [ ] **Step 1: 将叶子第3个参数用 `meta` 包裹**

```typescript
// 修改前
items: {
  me: ['get', '/me'],
  categories_root: ['get', '/categories/root', { tags: ['paginate'] }],
  badges_top: ['get', '/badges/top', { tags: ['paginate'], pageSize: 3 }],
},

// 修改后
items: {
  me: ['get', '/me'],
  categories_root: ['get', '/categories/root', { meta: { tags: ['paginate'] } }],
  badges_top: ['get', '/badges/top', { meta: { tags: ['paginate'], pageSize: 3 } }],
},
```

- [ ] **Step 2: 验证示例项目能正常构建**

Run: `cd /Users/afei/github/http-schema && pnpm build`
Expected: 构建成功，无报错

- [ ] **Step 3: 提交**

```bash
git add apps/example/src/schema.ts
git commit -m "fix(example): wrap leaf config with meta key"
```