# http-schema 多类型（typed）API 设计文档

> 日期：2026-08-09
> 状态：待审查

## 一、目标

现有 http-schema 支持声明式 DSL 生成扁平 API。但业务中常存在**多业务线同构 API**问题：例如研究生（graduate）与本科（undergraduate）两套接口，结构相同、路径不同、前缀不同。若按现有方式定义，会生成 `graduate_get_user_collects` 与 `undergraduate_get_user_collects` 等带前缀的长函数名，调用方需自行区分。

本设计引入 **type 分组**：在分组级声明 `type` 标识业务类型，运行时通过 `resolveType` 动态路由到对应类型的同构 API，实现统一调用入口。

## 二、已确认决策

| 决策点 | 结论 |
|--------|------|
| 新增字段 | `HttpSchemaItem.type`，与 `prefix`/`request` 同级 |
| 运行时路由 | `HttpSchemaOptions.resolveType: (data?, options?) => string`，同步函数 |
| 调用频率 | 每次调用 typed API 都执行 `resolveType`，不缓存 |
| 调用方式 | `api.typed('schemaKey')` 返回可调用函数，再 `(data, options)` 调用 |
| 命名空间 | typed API 独立于普通 API，放在 `api.typed` 下，不与普通 key 平级 |
| key 冲突 | typed 分组内叶子用原始 key，不拼接 prefix/suffix；同 key 多 type 由 resolveType 路由 |
| 普通分组 | 完全不受影响，保持现有行为 |

## 三、类型定义变更（types.ts）

### 3.1 `HttpSchemaItem` 新增 `type`

```typescript
interface HttpSchemaItem {
  type?: string;        // 业务类型标识，如 'graduate' | 'undergraduate'
  request?: [string, DataType];
  baseURL?: string;
  prefix?: string;
  suffix?: string;
  resources?: (string | ResourceDef)[];
  config?: Partial<RequestConfig>;
  items?: HttpSchemaItems;
}
```

### 3.2 `ApiItem` 新增 `type`

```typescript
interface ApiItem {
  id: string;           // 带 type 的分组 → 原始 key
  key: string;
  type?: string;        // 从分组继承
  method: string;
  fullPath: string;
  dataType: DataType;
  baseURL: string;
  config?: Partial<RequestConfig>;
}
```

### 3.3 `HttpSchemaOptions` 新增 `resolveType`

```typescript
interface HttpSchemaOptions {
  baseURL?: string;
  dataType?: DataType;
  adapter?: Adapter;
  interceptors?: InterceptorLike[];
  transformResponse?: (res: any) => any;
  resolveType?: (data?: any, options?: Record<string, any>) => string;
}
```

## 四、Parser 变更（parser.ts）

### 4.1 ParseContext 新增 type

```typescript
interface ParseContext {
  baseURL: string;
  prefix: string;
  dataType: DataType;
  namePrefix: string;
  nameSuffix: string;
  type?: string;        // 新增
  config: Partial<RequestConfig>;
}
```

### 4.2 分组进入时重置 prefix/suffix

数组分支中，带 `type` 的分组重置 namePrefix/nameSuffix 为空，使所有叶子 id 使用原始 key：

```typescript
const subCtx: ParseContext = {
  baseURL: item.baseURL ?? ctx.baseURL,
  prefix: item.request ? joinPaths(ctx.prefix, item.request[0]) : ctx.prefix,
  dataType: item.request?.[1] ?? ctx.dataType,
  namePrefix: item.type ? '' : (item.prefix ?? ctx.namePrefix),
  nameSuffix: item.type ? '' : (item.suffix ?? ctx.nameSuffix),
  type: item.type ?? ctx.type,
  config: item.config ? { ...ctx.config, ...item.config } : ctx.config,
};
```

### 4.3 叶子 id 生成

叶子分支 id 生成逻辑不变：`id = ctx.namePrefix + rawKey + ctx.nameSuffix`。因带 type 分组 namePrefix/nameSuffix 已重置为空，故 `id = rawKey`。

同时 ApiItem 记录 `type`：

```typescript
result.push({
  id,
  key: rawKey,
  type: ctx.type,
  method: method.toLowerCase(),
  fullPath: joinPaths(ctx.prefix, path),
  dataType: ctx.dataType,
  baseURL: ctx.baseURL,
  config: mergedConfig,
});
```

**注意：** 带 type 分组内若仍有嵌套分组，其 namePrefix/nameSuffix 同样被外层 type 重置为空。

## 五、入口变更（index.ts）

### 5.1 分类

```typescript
const typedItems = items.filter(item => item.type);
const normalItems = items.filter(item => !item.type);
```

### 5.2 普通 items 保持不变

```typescript
normalItems.forEach((item) => {
  api[item.id] = createApiFn(item, httpClient, options);
});
```

### 5.3 typed 函数

```typescript
api.typed = (key: string) => {
  return (data?: any, callOptions?: Record<string, any>) => {
    const type = options.resolveType?.(data, callOptions);
    if (!type) {
      throw new Error(`httpSchema: resolveType returned undefined for key "${key}"`);
    }

    const item = typedItems.find(i => i.type === type && i.key === key);
    if (!item) {
      throw new Error(
        `httpSchema: type "${type}" has no API key "${key}". ` +
        `Available keys for this type: ${typedItems.filter(i => i.type === type).map(i => i.key).join(', ')}`
      );
    }

    // 复用现有请求逻辑（splitData → 构建 config → httpClient.request）
  };
};
```

**关键点：**
- `typed` 是函数，返回可调用函数
- 每次调用执行 `resolveType` 动态路由
- 未定义 type 或 type 下无此 key 时抛清晰错误

### 5.4 type 分组无需 prefix/suffix

`prefix` 字段仅影响函数名（`namePrefix`），不影响 URL 路径（路径由 `request[0]` 与叶子 `path` 拼接决定）。由于 type 分组的 namePrefix/nameSuffix 已被重置为空，`prefix`/`suffix` 在 type 分组中**不生效、无需声明**。示例：

```typescript
{
  type: 'undergraduate',   // 不写 prefix，函数自动存到 __typed__['undergraduate@...']
  request: ['/api/v1', 'json'],
  items: {
    get_user_collects: ['get', '/recommend/get_user_colleges'],
  }
}
```

路径自动拼为 `/api/v1/recommend/get_user_colleges`。

## 六、边界情况

1. **resolveType 未传**：typed API 调用时 `resolveType` 为 undefined，抛错误提示需先配置
2. **resolveType 返回未知 type**：抛错误，列出该 type 下可用 keys
3. **同 key 多 type**：正常，由 resolveType 路由
4. **某 type 缺某 key**：调用时抛错误，提示该 type 下可用 keys
5. **普通分组**：完全不受影响，api 上平铺
6. **type 分组嵌套**：内层 namePrefix/nameSuffix 被重置为空，id 统一用原始 key

## 七、调用示例

```typescript
const schema = {
  baseURL: '/api',
  items: [
    {
      type: 'graduate',
      request: ['/api/v1', 'json'],
      items: {
        get_user_collects: ['get', '/apply7/resume/get_user_programs'],
        delete_user_collect: ['post', '/apply7/resume/delete_user_program'],
        hot_schools: ['get', '/recommend/hot_program_universities'],
      }
    },
    {
      type: 'undergraduate',
      request: ['/api/v1', 'json'],
      items: {
        get_user_collects: ['get', '/recommend/get_user_colleges'],
        delete_user_collect: ['post', '/recommend/delete_user_college'],
        hot_schools: ['get', '/recommend/hot_major_colleges'],
      }
    },
    {
      resources: ['badges'],
    },
  ]
};

const api = httpSchema(schema, {
  adapter: new FetchAdapter(),
  resolveType: () => getUserType(),  // 'graduate' | 'undergraduate'
});

// 普通 API 不变
api.badges_index({ limit: 10 });

// typed API
const collects = await api.typed('get_user_collects')({ userId: 1 });
```

## 八、测试策略

`__tests__/parser.spec.ts` 补充：
- type 分组解析：id 用原始 key，ApiItem.type 正确
- type 分组嵌套：内层 id 仍为原始 key
- 无 type 分组：行为不变
- type 分组内 prefix/suffix 被重置

`__tests__/index.spec.ts` 补充：
- typed API 返回可调用函数
- resolveType 路由到对应 path
- resolveType 返回未知 type 抛错
- resolveType 未配置抛错
- 某 type 缺 key 抛错
- 普通 API 与 typed API 共存