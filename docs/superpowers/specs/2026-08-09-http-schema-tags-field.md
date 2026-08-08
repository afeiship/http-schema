# http-schema tags 字段优化

> 日期：2026-08-09
> 状态：已批准

## 一、目标

将 `tags` 从 `meta.tags` 提升为 `RequestConfig` 的顶层字段，让 DSL 可以直接写 `{ tags: ['paginate'] }`，拦截器直接读 `res.config?.tags`，不再需要 `meta.` 前缀。

## 二、已确认决策

| 决策点 | 结论 |
|--------|------|
| `tags` 位置 | `RequestConfig.tags?: string[]`（顶层字段） |
| `meta` 的作用 | 保留，用于存放自定义扩展字段（如 `pageSize`） |
| `UnifiedInterceptor.tags` | 已存在，不动 |
| 实施顺序 | 先改 `universal-request`（手动发布），再改 `http-schema`（升级依赖） |

## 三、实施阶段

### 第一阶段：universal-request（`/Users/afei/github/universal-request`）

**变更文件：**
- `packages/core/src/types.ts`

在 `RequestConfig` 接口的 `meta` 字段后新增 `tags`：

```typescript
export interface RequestConfig {
  // 基础配置
  url: string;
  method?: HttpMethod;
  baseURL?: string;
  headers?: Record<string, string>;
  payload?: any;

  // 功能配置
  timeout?: number;
  responseType?: ResponseType;
  dataType?: DataType;
  signal?: AbortSignal;
  withCredentials?: boolean;

  // 老版本特性
  resolveError?: boolean;

  // 元数据（透传到拦截器）
  meta?: Record<string, any>;

  // 标签（用于拦截器匹配等场景）
  tags?: string[];

  // 扩展字段
  [key: string]: any;
}
```

**完成后的操作：**
- 你手动发布新版 `@jswork/universal-request-core`

### 第二阶段：http-schema

**前置条件：** `@jswork/universal-request-core` 新版已发布，http-schema 升级依赖。

**变更文件：**

| 文件 | 变更 |
|------|------|
| `packages/core/package.json` | 升级 `@jswork/universal-request-core` 依赖版本 |
| `apps/example/src/schema.ts` | DSL 简化，`tags` 提升到顶层 |
| `apps/example/src/interceptors/paginate.ts` | 读 `config.tags` 代替 `config.meta.tags` |
| `apps/example/src/interceptors/tag-transform.ts` | 读 `config.tags` 代替 `config.meta.tags` |
| `__tests__/parser.spec.ts` | 测试更新（如有必要） |
| `__tests__/index.spec.ts` | 测试更新（如有必要） |

#### 2a. 依赖升级

`packages/core/package.json`：

```json
{
  "dependencies": {
    "@jswork/universal-request-core": "^1.0.11"
  }
}
```

#### 2b. 示例 schema 简化

`apps/example/src/schema.ts`：

```typescript
// 之前
categories_root: ['get', '/categories/root', { meta: { tags: ['paginate'] } }],
badges_top: ['get', '/badges/top', { meta: { tags: ['paginate'], pageSize: 3 } }],

// 之后
categories_root: ['get', '/categories/root', { tags: ['paginate'] }],
badges_top: ['get', '/badges/top', { tags: ['paginate'], meta: { pageSize: 3 } }],
```

#### 2c. 拦截器更新

`apps/example/src/interceptors/paginate.ts`：

```typescript
// 之前
const meta = res.config?.meta;
if (!meta?.tags?.includes('paginate')) return res;
const pageSize = meta.pageSize ?? 10;

// 之后
const tags = res.config?.tags;
if (!tags?.includes('paginate')) return res;
const pageSize = res.config?.meta?.pageSize ?? 10;
```

`apps/example/src/interceptors/tag-transform.ts`：

```typescript
// 之前
const tags = res.config?.meta?.tags as string[] | undefined;

// 之后
const tags = res.config?.tags as string[] | undefined;
```

#### 2d. 测试更新

`__tests__/index.spec.ts`：

```typescript
// 之前
categories_root: ['get', '/categories/root', { tags: ['ni2lv'] }],
expect(adapter.lastConfig?.tags).toEqual(['ni2lv']);

// 之后 — 不变，tags 本身就是顶层字段，测试已正确
```

`__tests__/parser.spec.ts` 中的 config 合并测试，涉及 `{ meta: { tags: [...] } }` 的写法保持不变（meta 仍保留用于自定义字段）。

## 四、数据流示例

```
DSL:
{
  badges_top: ['get', '/badges/top', { tags: ['paginate'], meta: { pageSize: 3 } }],
}

解析后 ApiItem.config:
{ tags: ['paginate'], meta: { pageSize: 3 } }

spread 到 RequestConfig:
{
  url: '/badges/top',
  method: 'GET',
  tags: ['paginate'],       // 顶层字段
  meta: { pageSize: 3 },    // 自定义字段
}

拦截器读取:
res.config.tags       → ['paginate']
res.config.meta       → { pageSize: 3 }
res.config.meta.pageSize → 3
```

## 五、边界情况

1. **无 tags**：`tags` 为 `undefined`，拦截器 `!tags?.includes(...)` 安全短路
2. **空 tags**：`tags: []`，拦截器行为与 `undefined` 一致
3. **tags 与 meta 同用**：`{ tags: ['a'], meta: { x: 1 } }`，两者互不干扰
4. **向后兼容**：旧版 `{ meta: { tags: [...] } }` 仍可工作（`meta.tags` 还在），但推荐新写法