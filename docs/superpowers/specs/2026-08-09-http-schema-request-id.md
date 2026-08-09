# http-schema: 在 RequestConfig 中注入接口 id

日期：2026-08-09

## 背景与目标

目前 `httpSchema` 解析 DSL 后生成的每个接口函数（如 `api.categories_root(data)`）在发起请求时，会构建一个 `RequestConfig` 传给 `httpClient.request(config)`。拦截器（interceptor）在处理请求/响应时，只能通过 `res.config` 拿到 URL、method、tags 等信息，但**无法直接定位当前请求对应的是哪个 schema 接口 key**。

例如，example 中的 `categories_root` 和 `badges_top` 都带 `tags: ['paginate']`，分页拦截器通过 tags 触发，但无法区分具体是哪个接口。若需针对单接口做特殊处理，目前只能通过 URL 或 method 猜测，脆弱且不直观。

**目标**：在 `RequestConfig` 顶层注入一个 `id` 字段，值为该接口的 schema key（即 `item.name`），让拦截器能直接定位当前请求对应的接口。

## 设计

### RequestConfig.id

在构建给 `httpClient.request(config)` 的 `RequestConfig` 时，自动注入 `id` 字段，值为解析后的接口名 `item.name`。

`RequestConfig` 类型已声明 `[key: string]: any`，故无需修改上游 `@jswork/universal-request-core` 的类型定义。

### 注入位置

`packages/core/src/index.ts` 中构建 config 处：

```typescript
const config: RequestConfig = {
  url: resolvedPath,
  method: item.method.toUpperCase() as any,
  baseURL: item.baseURL || undefined,
  dataType: (options?.dataType ?? item.dataType) as any,
  id: item.name,       // 新增：注入接口 schema key
  ...item.config,
  ...callOptions,
};
```

`id` 放在 `...item.config` 与 `...callOptions` **之前**。若用户在 DSL 的 `item.config` 或调用时的 `callOptions` 中显式传了 `id`，则显式值优先，覆盖自动注入值。这是合理行为——用户显式指定优先。

### 拦截器中的读取方式

```typescript
const interceptor = () => ({
  id: 'my-interceptor',
  response: (res) => {
    const schemaId = res.config.id;
    if (schemaId === 'categories_root') {
      // 仅针对该接口做特殊处理
    }
    return res;
  },
});
```

## 改动范围

- `packages/core/src/index.ts`：仅新增 `id: item.name` 一行。
- 类型定义 `types.ts`：无需改动（`RequestConfig` 允许任意扩展键）。
- 上游 `@jswork/universal-request-core`：无需改动。

## 测试

新增/更新 `packages/core/__tests__/` 下的用例，验证：

1. 生成的接口函数发起请求时，`config.id` 等于接口的 schema key。
2. 当 `callOptions` 或 `item.config` 显式传入 `id` 时，显式值优先。

## 未纳入范围

- 不将 `id` 作为请求头或参数发送给后端（用户已确认仅 interceptor 内部使用）。
- 不修改 `ApiItem` / `parse` 的数据结构。