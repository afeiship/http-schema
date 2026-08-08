# http-schema Adapter 去内置化设计

> 日期：2026-08-08
> 状态：已批准

## 目标

移除 `@jswork/http-schema` 对 `FetchAdapter` 和 `AxiosAdapter` 的硬依赖，改为由调用方在运行时注入 adapter 实例。

## 变更清单

### 1. types.ts

`HttpSchemaOptions.adapter` 类型从 `'Fetch' | 'Axios'` 改为 `Adapter`（复用 `@jswork/universal-request-core` 的接口）。

```typescript
import type { Adapter } from '@jswork/universal-request-core';

export interface HttpSchemaOptions {
  baseURL?: string;
  dataType?: DataType;
  adapter?: Adapter;          // 注入 adapter 实例，非必填但未传时抛错
  interceptors?: InterceptorLike[];
  transformResponse?: (res: any) => any;
}
```

### 2. index.ts

- 删除 `FetchAdapter` / `AxiosAdapter` 两个 import
- adapter 由调用方传入，未传时在构造 httpClient 前抛错

```typescript
import { createRequest } from '@jswork/universal-request-core';
import type { RequestConfig, Adapter } from '@jswork/universal-request-core';
// 不再 import FetchAdapter / AxiosAdapter

function httpSchema(schema: HttpSchemaConfig, options?: HttpSchemaOptions): ApiInstance {
  const items = parseSchema(schema);
  const baseURL = options?.baseURL ?? schema.baseURL ?? '';

  // adapter 必须传入
  if (!options?.adapter) {
    throw new Error('httpSchema: adapter is required. Pass an adapter instance, e.g. new FetchAdapter()');
  }

  const httpClient = createRequest({
    baseURL,
    adapter: options.adapter,
    interceptors: options?.interceptors,
  });
  // ...
}
```

### 3. package.json

删除两个 adapter 依赖：

```
- @jswork/universal-request-adapter-axios
- @jswork/universal-request-adapter-fetch
```

### 4. 测试更新

`__tests__/index.spec.ts`:

- `adapter: 'Axios'` 改为传入真实 adapter 实例（引入 `FetchAdapter`）
- 新增测试：未传 adapter 时抛错

```typescript
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';

it('should work with injected adapter', () => {
  const api = httpSchema(config, {
    adapter: new FetchAdapter(),
  });
  expect(api).toHaveProperty('ping');
});

it('should throw when adapter is missing', () => {
  expect(() => httpSchema({ items: { ping: ['get', '/ping'] } }))
    .toThrow(/adapter is required/);
});
```

### 5. 调用方变化

```typescript
// 之前
httpSchema(schema, { adapter: 'Fetch' })

// 之后
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';
httpSchema(schema, { adapter: new FetchAdapter() })
```

## 影响范围

| 文件 | 变更 |
|------|------|
| `src/types.ts` | adapter 类型改为 `Adapter` |
| `src/index.ts` | 删 2 import，加 adapter 必填校验 |
| `package.json` | 删 2 个 adapter 依赖 |
| `__tests__/index.spec.ts` | 更新 adapter 测试 |