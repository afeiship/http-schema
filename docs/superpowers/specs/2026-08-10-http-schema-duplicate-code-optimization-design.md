# http-schema 重复代码优化设计

## 背景

`@jswork/http-schema` 核心源码（`packages/core/src/index.ts`）中存在两处明显的重复代码：

1. **手写路径参数提取** — 用正则手工实现 `{param}` 和 `:param` 两种语法的参数提取，而依赖 `@jswork/path-dual-parser` 已提供 `params()` 函数实现相同功能。
2. **请求执行逻辑重复** — `normalItems` 和 `api.typed` 两段代码几乎逐行相同（~60 行重复），均执行 `splitData → 转 string → parse → 构建 config → request → transformResponse` 流程。

## 目标

- 消除重复代码，保持行为完全一致
- 零外部 API 变更
- 所有现有测试通过

## 方案

采用最小改动方案，仅修改 `index.ts` 一个文件。

### 1. 参数提取替换

- 删除手写 `extractParams` 函数（~17 行）
- 将 `import { parse } from '@jswork/path-dual-parser'` 改为 `import { parse, params as extractParams } from '@jswork/path-dual-parser'`
- `splitData` 函数内部调用不变，只是实现来源从手写改为 `path-dual-parser`

### 2. 请求执行逻辑去重

抽取共享函数 `executeRequest`：

```typescript
function executeRequest(opts: {
  item: ApiItem;
  data: any;
  callOptions?: Record<string, any>;
  httpClient: ReturnType<typeof createRequest>;
  options?: HttpSchemaOptions;
}): Promise<any> {
  const { item, data, callOptions, httpClient, options } = opts;
  const [params, payload] = splitData(item.fullPath, data);
  const stringParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    stringParams[k] = String(v);
  }
  const resolvedPath = parse(item.fullPath, stringParams);

  const config: RequestConfig = {
    url: resolvedPath,
    method: item.method.toUpperCase() as any,
    baseURL: item.baseURL || undefined,
    dataType: (options?.dataType ?? item.dataType) as any,
    id: item.id,
    key: item.key,
    ...item.config,
    ...callOptions,
  };

  if (payload !== undefined) {
    config.payload = payload;
  }

  return httpClient.request(config).then((res) => {
    if (options?.transformResponse) {
      return options.transformResponse(res);
    }
    return res;
  });
}
```

两处调用点简化为（单对象传参）：

```typescript
// normalItems 中
api[item.id] = (data, callOptions) =>
  executeRequest({ item, data, callOptions, httpClient, options });

// typed 中 — 查找 item 后
return executeRequest({ item, data, callOptions, httpClient, options });
```

### 3. 变更清单

| 文件 | 变更 | 影响 |
|------|------|------|
| `packages/core/src/index.ts` | 删除 `extractParams`，新增 `executeRequest`，更新 import | ~-41 行净减少 |
| `packages/core/src/parser.ts` | 无变更 | — |
| `packages/core/src/rest.ts` | 无变更 | — |
| `packages/core/src/types.ts` | 无变更 | — |
| 测试文件 | 无变更，全部通过 | — |

## 验证方式

- `bun test` 所有测试通过
- 行为零变化：不改变 DSL 输入格式、不改变 API 输出、不改变请求执行流程