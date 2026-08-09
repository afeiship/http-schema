# Typed API (resolveType) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `type` field to HttpSchemaItem groups and `resolveType` to HttpSchemaOptions, enabling dynamic routing via `api.typed('key')(data)`.

**Architecture:** Three-phase change: (1) types.ts adds `type` fields and `resolveType` option; (2) parser.ts propagates `type` from group to ApiItem and resets prefix/suffix for typed groups; (3) index.ts separates typed items from normal items and exposes `api.typed` function.

**Tech Stack:** TypeScript, bun test

---

### Task 1: Add `type` to `ApiItem` and `resolveType` to `HttpSchemaOptions`

**Files:**
- Modify: `packages/core/src/types.ts`

- [ ] **Step 1: Add `type` to `ApiItem`**

```typescript
// packages/core/src/types.ts, around line 47-55
export interface ApiItem {
  id: string;
  key: string;
  type?: string;        // 新增：业务类型标识，继承自分组
  method: string;
  fullPath: string;
  dataType: DataType;
  baseURL: string;
  config?: Partial<RequestConfig>;
}
```

- [ ] **Step 2: Add `resolveType` to `HttpSchemaOptions`**

```typescript
// packages/core/src/types.ts, around line 58-63
export interface HttpSchemaOptions {
  baseURL?: string;
  dataType?: DataType;
  adapter?: Adapter;
  interceptors?: InterceptorLike[];
  transformResponse?: (res: any) => any;
  resolveType?: (data?: any, options?: Record<string, any>) => string;  // 新增
}
```

- [ ] **Step 3: Run tests to verify no regression**

```bash
cd /Users/afei/github/http-schema/packages/core && bun test
```
Expected: All existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/types.ts
git commit -m "feat: add type field to ApiItem and resolveType to HttpSchemaOptions"
```

---

### Task 2: Parser — propagate `type` from group to ApiItem

**Files:**
- Modify: `packages/core/src/parser.ts`
- Test: `packages/core/__tests__/parser.spec.ts`

- [ ] **Step 1: Write the failing test — type group parsing**

Add to `packages/core/__tests__/parser.spec.ts`:

```typescript
it('should propagate type from group to ApiItem', () => {
  const config: HttpSchemaConfig = {
    baseURL: 'http://test.com',
    request: ['/api', 'json'],
    items: [
      {
        type: 'graduate',
        request: ['/v1', 'json'],
        items: {
          get_user_collects: ['get', '/collects'],
          delete_user_collect: ['post', '/collects/delete'],
        }
      }
    ]
  };
  const result = parse(config);
  expect(result).toHaveLength(2);
  expect(result[0].id).toBe('get_user_collects');   // 原始 key
  expect(result[0].key).toBe('get_user_collects');
  expect(result[0].type).toBe('graduate');
  expect(result[1].id).toBe('delete_user_collect');
  expect(result[1].key).toBe('delete_user_collect');
  expect(result[1].type).toBe('graduate');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/afei/github/http-schema/packages/core && bun test
```
Expected: Parser tests fail — `result[0].type` is undefined.

- [ ] **Step 3: Write the passing test — type group resets prefix/suffix**

```typescript
it('should reset prefix/suffix for typed groups', () => {
  const config: HttpSchemaConfig = {
    baseURL: 'http://test.com',
    request: ['/api', 'json'],
    items: [
      {
        type: 'graduate',
        prefix: 'should_be_ignored_',
        suffix: 'V2',
        request: ['/v1', 'json'],
        items: {
          get_user_collects: ['get', '/collects'],
        }
      }
    ]
  };
  const result = parse(config);
  expect(result[0].id).toBe('get_user_collects');   // 不是 should_be_ignored_get_user_collectsV2
  expect(result[0].key).toBe('get_user_collects');
});
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd /Users/afei/github/http-schema/packages/core && bun test
```
Expected: Fails — `result[0].id` is `should_be_ignored_get_user_collectsV2`.

- [ ] **Step 5: Write the passing test — untagged groups unchanged**

```typescript
it('should preserve existing behavior for non-typed groups', () => {
  const config: HttpSchemaConfig = {
    baseURL: 'http://test.com',
    request: ['/api', 'json'],
    items: [
      {
        prefix: 'v1_',
        items: {
          me: ['get', '/me'],
        }
      }
    ]
  };
  const result = parse(config);
  expect(result[0].id).toBe('v1_me');
  expect(result[0].type).toBeUndefined();
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
cd /Users/afei/github/http-schema/packages/core && bun test
```
Expected: Fails — `result[0].type` is undefined but the test expects undefined, hmm, this might pass. Let me adjust — the existing behavior should just work since no type field is set. Let me write this step without the type assertion, and just verify existing behavior is preserved.

Actually, the existing test for prefix/suffix already exists (`should handle prefix/suffix on function names`). I just need to verify that non-typed groups are unaffected. Let me adjust:

```typescript
it('should preserve existing behavior for non-typed groups', () => {
  const config: HttpSchemaConfig = {
    baseURL: 'http://test.com',
    request: ['/api', 'json'],
    items: [
      {
        prefix: 'v1_',
        items: {
          me: ['get', '/me'],
        }
      }
    ]
  };
  const result = parse(config);
  expect(result[0].id).toBe('v1_me');
  expect(result[0].key).toBe('me');
  expect(result[0].type).toBeUndefined();
});
```

- [ ] **Step 7: Run the two new tests to verify they fail**

```bash
cd /Users/afei/github/http-schema/packages/core && bun test
```
Expected: The new typed-group tests fail because parser doesn't handle `type` yet.

- [ ] **Step 8: Implement parser changes**

Edit `packages/core/src/parser.ts`:

1. Add `type` to `ParseContext` interface:

```typescript
interface ParseContext {
  baseURL: string;
  prefix: string;
  dataType: DataType;
  namePrefix: string;
  nameSuffix: string;
  type?: string;         // 新增
  config: Partial<RequestConfig>;
}
```

2. In the array (`parseItems`) branch, propagate `type` and reset namePrefix/nameSuffix when type is present:

```typescript
items.forEach((item) => {
  const subCtx: ParseContext = {
    baseURL: item.baseURL ?? ctx.baseURL,
    prefix: item.request ? joinPaths(ctx.prefix, item.request[0]) : ctx.prefix,
    dataType: item.request?.[1] ?? ctx.dataType,
    namePrefix: item.type ? '' : (item.prefix ?? ctx.namePrefix),
    nameSuffix: item.type ? '' : (item.suffix ?? ctx.nameSuffix),
    type: item.type ?? ctx.type,
    config: item.config ? { ...ctx.config, ...item.config } : ctx.config,
  };
  // ...
});
```

3. In the leaf (`Object.entries`) branch, record `type` on ApiItem:

```typescript
result.push({
  id,
  key: rawKey,
  type: ctx.type,       // 新增
  method: method.toLowerCase(),
  fullPath: joinPaths(ctx.prefix, path),
  dataType: ctx.dataType,
  baseURL: ctx.baseURL,
  config: mergedConfig,
});
```

- [ ] **Step 9: Run tests to verify all pass**

```bash
cd /Users/afei/github/http-schema/packages/core && bun test
```
Expected: All parser tests pass (old + new).

- [ ] **Step 10: Commit**

```bash
git add packages/core/src/parser.ts packages/core/__tests__/parser.spec.ts
git commit -m "feat(parser): propagate type from group to ApiItem, reset prefix/suffix for typed groups"
```

---

### Task 3: Index — expose `api.typed` function

**Files:**
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/__tests__/index.spec.ts`

- [ ] **Step 1: Write the failing test — typed API basic routing**

Add to `packages/core/__tests__/index.spec.ts`:

```typescript
import type { HttpSchemaConfig, HttpSchemaOptions } from '../src/types';

// ... (after existing tests)

describe('typed API', () => {
  it('should expose api.typed as a function', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [
        {
          type: 'graduate',
          request: ['/v1', 'json'],
          items: {
            get_user_collects: ['get', '/collects'],
          }
        }
      ]
    };
    const api = httpSchema(config, {
      adapter: new FetchAdapter(),
      resolveType: () => 'graduate',
    });
    expect(api).toHaveProperty('typed');
    expect(typeof api.typed).toBe('function');
    // api.typed should return a callable function
    const fn = api.typed('get_user_collects');
    expect(typeof fn).toBe('function');
  });

  it('should route to correct path via resolveType', async () => {
    const adapter = new CaptureAdapter();
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [
        {
          type: 'graduate',
          request: ['/v1', 'json'],
          items: {
            get_user_collects: ['get', '/collects'],
          }
        },
        {
          type: 'undergraduate',
          request: ['/v1', 'json'],
          items: {
            get_user_collects: ['get', '/colleges'],
          }
        }
      ]
    };
    const api = httpSchema(config, {
      adapter,
      resolveType: () => 'graduate',
    });
    await api.typed('get_user_collects')({ userId: 1 });
    expect(adapter.lastConfig?.url).toBe('/api/v1/collects');
  });

  it('should return different routes for different types', async () => {
    const adapter = new CaptureAdapter();
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [
        {
          type: 'graduate',
          request: ['/v1', 'json'],
          items: {
            get_user_collects: ['get', '/collects'],
          }
        },
        {
          type: 'undergraduate',
          request: ['/v1', 'json'],
          items: {
            get_user_collects: ['get', '/colleges'],
          }
        }
      ]
    };
    // Test graduate
    const apiGraduate = httpSchema(config, { adapter, resolveType: () => 'graduate' });
    await apiGraduate.typed('get_user_collects')({ userId: 1 });
    expect(adapter.lastConfig?.url).toBe('/api/v1/collects');

    // Test undergraduate
    const apiUndergrad = httpSchema(config, { adapter, resolveType: () => 'undergraduate' });
    await apiUndergrad.typed('get_user_collects')({ userId: 1 });
    expect(adapter.lastConfig?.url).toBe('/api/v1/colleges');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/afei/github/http-schema/packages/core && bun test
```
Expected: Tests fail — `api.typed` is undefined.

- [ ] **Step 3: Write the failing test — resolveType errors**

```typescript
it('should throw when resolveType returns undefined', async () => {
  const config: HttpSchemaConfig = {
    baseURL: 'http://test.com',
    request: ['/api', 'json'],
    items: [{
      type: 'graduate',
      request: ['/v1', 'json'],
      items: { get_user_collects: ['get', '/collects'] }
    }]
  };
  const api = httpSchema(config, { adapter: new FetchAdapter(), resolveType: () => '' as any });
  await expect(api.typed('get_user_collects')({})).rejects.toThrow(/resolveType/);
});

it('should throw when resolveType returns unknown type', async () => {
  const config: HttpSchemaConfig = {
    baseURL: 'http://test.com',
    request: ['/api', 'json'],
    items: [{
      type: 'graduate',
      request: ['/v1', 'json'],
      items: { get_user_collects: ['get', '/collects'] }
    }]
  };
  const api = httpSchema(config, { adapter: new FetchAdapter(), resolveType: () => 'unknown' });
  await expect(api.typed('get_user_collects')({})).rejects.toThrow(/unknown/);
});

it('should throw when resolveType is not configured', async () => {
  const config: HttpSchemaConfig = {
    baseURL: 'http://test.com',
    request: ['/api', 'json'],
    items: [{
      type: 'graduate',
      request: ['/v1', 'json'],
      items: { get_user_collects: ['get', '/collects'] }
    }]
  };
  const api = httpSchema(config, { adapter: new FetchAdapter() } as any);
  await expect(api.typed('get_user_collects')({})).rejects.toThrow(/resolveType/);
});

it('should throw when type has no matching key', async () => {
  const config: HttpSchemaConfig = {
    baseURL: 'http://test.com',
    request: ['/api', 'json'],
    items: [{
      type: 'graduate',
      request: ['/v1', 'json'],
      items: { get_user_collects: ['get', '/collects'] }
    }]
  };
  const api = httpSchema(config, { adapter: new FetchAdapter(), resolveType: () => 'graduate' });
  await expect(api.typed('nonexistent_key')({})).rejects.toThrow(/nonexistent_key/);
});
```

- [ ] **Step 4: Run test to verify fails**

```bash
cd /Users/afei/github/http-schema/packages/core && bun test
```
Expected: All typed API tests fail.

- [ ] **Step 5: Write the passing test — typed API coexists with normal API**

```typescript
it('should coexist with normal API keys', () => {
  const config: HttpSchemaConfig = {
    baseURL: 'http://test.com',
    request: ['/api', 'json'],
    items: [
      { type: 'graduate', items: { ping: ['get', '/ping'] } },
      { items: { admin_login: ['post', '/admin/login'] } },
    ]
  };
  const api = httpSchema(config, { adapter: new FetchAdapter(), resolveType: () => 'graduate' });
  expect(api).toHaveProperty('admin_login');
  expect(typeof api.admin_login).toBe('function');
  expect(typeof api.typed).toBe('function');
  expect(typeof api.typed('ping')).toBe('function');
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
cd /Users/afei/github/http-schema/packages/core && bun test
```
Expected: All typed API tests fail.

- [ ] **Step 7: Implement index.ts changes**

Edit `packages/core/src/index.ts`:

After `const items = parseSchema(schema);`, add typed item classification and the `api.typed` function:

```typescript
const items = parseSchema(schema);

// 1. 分类：typed items vs normal items
const typedItems = items.filter((item) => item.type);
const normalItems = items.filter((item) => !item.type);
```

Replace `items.forEach(...)` with `normalItems.forEach(...)`:

```typescript
normalItems.forEach((item: ApiItem) => {
  api[item.id] = (data?: any, callOptions?: Record<string, any>) => {
    // ... existing request logic ...
  };
});
```

Add `api.typed` function after the `normalItems.forEach` loop:

```typescript
// typed API：动态路由
api.typed = (key: string) => {
  return (data?: any, callOptions?: Record<string, any>) => {
    const type = options?.resolveType?.(data, callOptions);
    if (!type) {
      return Promise.reject(
        new Error(`httpSchema: resolveType returned "${type}" for key "${key}". Ensure resolveType is configured and returns a non-empty string.`)
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

    // 复用现有请求逻辑
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
  };
};
```

- [ ] **Step 8: Run tests to verify all pass**

```bash
cd /Users/afei/github/http-schema/packages/core && bun test
```
Expected: All tests pass (old + new typed API tests).

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/index.ts packages/core/__tests__/index.spec.ts
git commit -m "feat: add api.typed for dynamic type-based routing"
```

---

### Task 4: Self-review and final verification

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/afei/github/http-schema/packages/core && bun test
```
Expected: All tests pass.

- [ ] **Step 2: Verify type export**

Check that `ApiItem.type` and `HttpSchemaOptions.resolveType` are exported from `dist/index.d.ts` after build:

```bash
cd /Users/afei/github/http-schema/packages/core && pnpm build
```
Expected: Build succeeds.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: build after typed API changes"
```