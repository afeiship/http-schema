# http-schema 重复代码优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除 `packages/core/src/index.ts` 中两处重复代码：手写参数提取 → 替换为 `path-dual-parser` 的 `params()`；normalItems 与 typed 的请求执行逻辑 → 抽取共享 `executeRequest` 函数。

**Architecture:** 仅修改 `index.ts` 一个文件，不涉及其他文件。新增 `executeRequest({ item, data, callOptions, httpClient, options })` 函数，删除手写 `extractParams`，更新 import。

**Tech Stack:** TypeScript, path-dual-parser, bun test

---

## 文件结构

| 文件 | 职责 | 变更 |
|------|------|------|
| `packages/core/src/index.ts` | http-schema 入口，请求执行 | 修改：删除 `extractParams`，新增 `executeRequest`，更新 import |
| 其他文件 | 不变 | 无 |

---

### Task 1: 优化 index.ts — 替换参数提取 + 抽取 executeRequest

**Files:**
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: 更新 import**

将 `import { parse } from '@jswork/path-dual-parser'` 改为带 `params` alias 的导入：

```typescript
import { parse, params as extractParams } from '@jswork/path-dual-parser';
```

- [ ] **Step 2: 删除手写 `extractParams` 函数**

删除 `index.ts:11-28` 的整个 `extractParams` 函数（从 `function extractParams` 到 `}` 前的空行）。

- [ ] **Step 3: 新增 `executeRequest` 共享函数**

在 `splitData` 函数之后，`httpSchema` 函数之前，添加：

```typescript
/**
 * 共享请求执行逻辑
 */
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

- [ ] **Step 4: 替换 `normalItems.forEach` 中的请求执行代码**

将 `index.ts:85-121`（从 `normalItems.forEach((item: ApiItem) => {` 开始到 `};` 结束）替换为：

```typescript
  normalItems.forEach((item: ApiItem) => {
    api[item.id] = (data?: any, callOptions?: Record<string, any>) =>
      executeRequest({ item, data, callOptions, httpClient, options });
  });
```

- [ ] **Step 5: 替换 `api.typed` 中的请求执行代码**

将 `index.ts:148-176`（从 `const [params, payload] = splitData(item.fullPath, data);` 到 `}` 的请求执行部分）替换为：

```typescript
        return executeRequest({ item, data, callOptions, httpClient, options });
```

确保 `api.typed` 中 `item` 查找逻辑（`const item = typedItems.find(...)` 和错误处理部分）保持不变。最终 `typed` 部分应为：

```typescript
  // typed API：通过 resolveType 动态路由
  if (typedItems.length > 0) {
    api.typed = (key: string) => {
      return (data?: any, callOptions?: Record<string, any>) => {
        const type = options?.resolveType?.(data, callOptions);
        if (!type) {
          return Promise.reject(
            new Error(`httpSchema: resolveType not configured or returned empty for key "${key}". Ensure resolveType is configured and returns a non-empty string.`)
          );
        }

        const item = typedItems.find((i) => i.type === type && i.key === key);
        if (!item) {
          const available = typedItems
            .filter((i) => i.type === type)
            .map((i) => i.key);
          return Promise.reject(
            new Error(
              `httpSchema: type "${type}" has no API key "${key}". ` +
              `Available keys for this type: ${available.join(', ')}`
            )
          );
        }

        return executeRequest({ item, data, callOptions, httpClient, options });
      };
    };
  }
```

- [ ] **Step 6: 运行测试验证**

```bash
cd /Users/afei/github/http-schema/packages/core && bun test
```

Expected: 所有测试通过（4 个测试文件，全部 PASS）

- [ ] **Step 7: 提交**

```bash
git add packages/core/src/index.ts
git commit -m "refactor: deduplicate request execution and replace manual param extraction

- Replace hand-written extractParams with path-dual-parser's params()
- Extract shared executeRequest() to eliminate duplicate logic
- Use single-object parameter for executeRequest

Co-Authored-By: Claude <noreply@anthropic.com>"
```