# http-schema 请求配置透传设计

> 日期：2026-08-09
> 状态：已批准

## 一、目标

让 DSL 叶子节点第3个参数直接对应 `httpClient.request(config)` 的 `RequestConfig`，而非当前独立的 `meta`。同时 `HttpSchemaItem` 支持分组级 `config` 作为默认值，与叶子级配置浅合并，叶子胜出。

## 二、已确认决策

| 决策点 | 结论 |
|--------|------|
| 第3个参数类型 | 直接使用 `Partial<RequestConfig>`（完整对应 httpClient 的第3个参数） |
| 分组 config | `HttpSchemaItem` 新增 `config?: Partial<RequestConfig>` |
| 合并策略 | 浅合并 `{ ...parentConfig, ...leafConfig }`，叶子胜出 |
| `meta` 的位置 | 不再独立，作为 `config.meta` 子字段 |
| 拦截器影响 | 拦截器 `res.config.meta` 读取方式完全不变 |
| 优先级链 | 基础字段(url/method/baseURL/dataType) < `item.config`(分组+叶子合并) < `callOptions`(调用时传入) |

## 三、变更清单

### 1. types.ts

**`HttpSchemaLeaf`** — 第3个参数从 `meta` 改为 `Partial<RequestConfig>`：

```typescript
export type HttpSchemaLeaf = [
  method: string,
  path: string,
  config?: Partial<RequestConfig>   // 之前: meta?: Record<string, any>
];
```

**`HttpSchemaItem`** — 新增 `config` 字段：

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

**`ApiItem`** — `meta` 替换为 `config`：

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

### 2. parser.ts

**`ParseContext`** 新增 `config` 字段：

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

**分组递归** — 浅合并父级 config 与 item.config：

```typescript
subCtx.config = item.config
  ? { ...ctx.config, ...item.config }
  : ctx.config;
```

**叶子解析** — 浅合并 ctx.config 与 leaf[2]：

```typescript
const [method, path, leafConfig] = leaf as HttpSchemaLeaf;
const mergedConfig = leafConfig
  ? { ...ctx.config, ...leafConfig }
  : ctx.config;
```

**顶层初始化** — 支持 `HttpSchemaConfig.config` 作为根级默认值：

```typescript
const ctx: ParseContext = {
  baseURL: config.baseURL ?? '',
  prefix: config.request?.[0] ?? '',
  dataType: config.request?.[1] ?? 'json',
  namePrefix: '',
  nameSuffix: '',
  config: config.config ?? {},
};
```

### 3. index.ts

**构造请求配置** — 从 `item.config` spread 代替单独的 `meta`：

```typescript
// 之前
const config: RequestConfig = {
  url: resolvedPath,
  method: item.method.toUpperCase() as any,
  baseURL: item.baseURL || undefined,
  dataType: (options?.dataType ?? item.dataType) as any,
  meta: item.meta,
  ...callOptions,
};

// 之后
const config: RequestConfig = {
  url: resolvedPath,
  method: item.method.toUpperCase() as any,
  baseURL: item.baseURL || undefined,
  dataType: (options?.dataType ?? item.dataType) as any,
  ...item.config,
  ...callOptions,
};
```

### 4. 示例项目更新

`apps/example/src/schema.ts` — 叶子第3个参数改为 `{ meta: {...} }` 包裹：

```typescript
// 之前
categories_root: ['get', '/categories/root', { tags: ['paginate'] }],
badges_top: ['get', '/badges/top', { tags: ['paginate'], pageSize: 3 }],

// 之后
categories_root: ['get', '/categories/root', { meta: { tags: ['paginate'] } }],
badges_top: ['get', '/badges/top', { meta: { tags: ['paginate'], pageSize: 3 } }],
```

### 5. 测试更新

**parser.spec.ts** — 检查 `item.config` 替代 `item.meta`：

```typescript
// 之前
expect(result[1].meta).toEqual({ tags: ['test'] });

// 之后
expect(result[1].config).toEqual({ tags: ['test'] });
```

新增 config 继承测试：

```typescript
it('should merge config from parent group and leaf', () => {
  // 分组 config: { timeout: 3000 }
  // 叶子 config: { timeout: 5000, meta: { tags: ['paginate'] } }
  // 结果: { timeout: 5000, meta: { tags: ['paginate'] } }（叶子胜出）
});
```

**index.spec.ts** — 端到端验证 config 透传：

```typescript
it('should pass config from schema to request config', async () => {
  const adapter = new CaptureAdapter();
  const config: HttpSchemaConfig = {
    baseURL: 'http://test.com',
    request: ['/api', 'json'],
    items: {
      categories_root: ['get', '/categories/root', { meta: { tags: ['ni2lv'] } }],
    }
  };
  const api = httpSchema(config, { adapter });
  await api.categories_root();
  expect(adapter.lastConfig?.meta).toEqual({ tags: ['ni2lv'] });
});
```

## 四、数据流示例

```
DSL:
{
  config: { timeout: 3000, headers: { 'X-Auth': 'global' } },  // 根级 config
  items: [{
    config: { headers: { 'X-Auth': 'group' } },                 // 分组级 config
    items: {
      foo: ['get', '/foo', { timeout: 5000, meta: { tags: ['paginate'] } }],  // 叶子级 config
    }
  }]
}

解析过程:
  根级 config: { timeout: 3000, headers: { 'X-Auth': 'global' } }
    ↓ 浅合并（分组胜出）
  分组 config: { timeout: 3000, headers: { 'X-Auth': 'group' } }
    ↓ 浅合并（叶子胜出）
  叶子 config: { timeout: 5000, headers: { 'X-Auth': 'group' }, meta: { tags: ['paginate'] } }
    ↓ spread 到 RequestConfig
  httpClient.request({
    url: '/base/foo',
    method: 'GET',
    baseURL: 'http://test.com',
    dataType: 'json',
    timeout: 5000,
    headers: { 'X-Auth': 'group' },
    meta: { tags: ['paginate'] },
    // ...callOptions（调用时传入，更高优先级）
  })
```

## 五、影响范围

| 文件 | 变更类型 |
|------|----------|
| `packages/core/src/types.ts` | 3 处类型修改 |
| `packages/core/src/parser.ts` | ParseContext 新增 + 约 10 行逻辑变更 |
| `packages/core/src/index.ts` | 1 行变更（spread config） |
| `apps/example/src/schema.ts` | 2 行更改（meta 包裹） |
| `__tests__/parser.spec.ts` | 更新 meta→config 断言 + 新增继承测试 |
| `__tests__/index.spec.ts` | 更新 meta→config 断言 |

## 六、边界情况

1. **无 config 时**：`ctx.config` 默认为 `{}`，spread 无副作用
2. **叶子无第3个参数**：`leafConfig` 为 `undefined`，使用 `ctx.config` 原样
3. **分组无 config**：`subCtx.config` 继承父级 `ctx.config`
4. **优先级链**：`callOptions` 始终最高，与之前行为一致