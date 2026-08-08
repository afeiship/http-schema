# http-schema Adapter De-internalization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove built-in FetchAdapter/AxiosAdapter dependencies, require adapter to be injected at runtime.

**Architecture:** `HttpSchemaOptions.adapter` type changes from `'Fetch' | 'Axios'` to `Adapter` interface. `index.ts` removes direct adapter imports and validates adapter presence. Caller provides adapter instance.

**Tech Stack:** TypeScript, @jswork/universal-request-core (Adapter type)

---

### Task 1: Adapter de-internalization

**Files:**
- Modify: `src/types.ts`
- Modify: `src/index.ts`
- Modify: `package.json`
- Modify: `__tests__/index.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/index.spec.ts (full replacement)
import { describe, it, expect } from 'bun:test';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';
import httpSchema from '../src/index';
import type { HttpSchemaConfig } from '../src/types';

describe('httpSchema', () => {
  it('should return an object with api functions', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: {
        ping: ['get', '/ping'],
      }
    };
    const api = httpSchema(config, { adapter: new FetchAdapter() });
    expect(api).toHaveProperty('ping');
    expect(typeof api.ping).toBe('function');
  });

  it('should handle complex nested schema', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [
        {
          request: ['/admin', 'json'],
          items: {
            login: ['post', '/auth'],
            profile: ['get', '/me'],
          }
        },
        {
          resources: ['tags', 'posts'],
          items: {
            tags_top: ['get', '/tags/top'],
          }
        }
      ]
    };
    const api = httpSchema(config, { adapter: new FetchAdapter() });
    expect(api).toHaveProperty('login');
    expect(api).toHaveProperty('profile');
    expect(api).toHaveProperty('tags_index');
    expect(api).toHaveProperty('tags_top');
    expect(api).toHaveProperty('posts_index');
  });

  it('should handle empty schema', () => {
    const api = httpSchema({}, { adapter: new FetchAdapter() });
    expect(api).toEqual({});
  });

  it('should work with options overrides', () => {
    const config: HttpSchemaConfig = {
      items: {
        ping: ['get', '/ping'],
      }
    };
    const api = httpSchema(config, {
      baseURL: 'http://override.com',
      dataType: 'json',
      adapter: new FetchAdapter(),
    });
    expect(api).toHaveProperty('ping');
  });

  it('should throw when adapter is missing', () => {
    expect(() => httpSchema({ items: { ping: ['get', '/ping'] } }))
      .toThrow(/adapter is required/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test __tests__/index.spec.ts`
Expected: FAIL because:
- `types.ts` still has `'Fetch' | 'Axios'` type
- `index.ts` still imports FetchAdapter/AxiosAdapter
- `index.ts` doesn't validate adapter presence

- [ ] **Step 3: Update types.ts**

Change `HttpSchemaOptions.adapter` type from `'Fetch' | 'Axios'` to `Adapter`:

```typescript
// src/types.ts
import type { DataType, InterceptorLike, Adapter } from '@jswork/universal-request-core';
export type { DataType, InterceptorLike, Adapter };

// ...

export interface HttpSchemaOptions {
  baseURL?: string;
  dataType?: DataType;
  adapter?: Adapter;
  interceptors?: InterceptorLike[];
  transformResponse?: (res: any) => any;
}
```

- [ ] **Step 4: Update index.ts**

Remove FetchAdapter/AxiosAdapter imports, add adapter validation:

```typescript
// src/index.ts
import { createRequest } from '@jswork/universal-request-core';
import type { RequestConfig } from '@jswork/universal-request-core';
import { parse } from '@jswork/path-dual-parser';
import type { ApiItem, ApiInstance, HttpSchemaConfig, HttpSchemaOptions } from './types';
import { parse as parseSchema } from './parser';

// ... extractParams, splitData unchanged ...

function httpSchema(
  schema: HttpSchemaConfig,
  options?: HttpSchemaOptions
): ApiInstance {
  // 1. 解析 DSL → 扁平 ApiItem[]
  const items = parseSchema(schema);

  // 2. 校验 adapter 必须传入
  if (!options?.adapter) {
    throw new Error('httpSchema: adapter is required (e.g. new FetchAdapter())');
  }

  // 3. 创建 RequestCore 实例
  const baseURL = options?.baseURL ?? schema.baseURL ?? '';
  const httpClient = createRequest({
    baseURL,
    adapter: options.adapter,
    interceptors: options?.interceptors,
  });

  // 4. 构建 api 实例（rest unchanged）
  // ...
}
```

- [ ] **Step 5: Update package.json**

Remove two adapter dependencies:

```bash
pnpm remove @jswork/universal-request-adapter-axios @jswork/universal-request-adapter-fetch
```

Then verify `package.json` no longer lists them in `dependencies`. Only `@jswork/path-dual-parser` and `@jswork/universal-request-core` should remain.

- [ ] **Step 6: Run test to verify it passes**

Run: `bun test`
Expected: 22 tests pass, 0 fail

- [ ] **Step 7: Verify build**

Run: `pnpm build`
Expected: Build succeeds (CJS/ESM/UMD + DTS)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: remove built-in adapters, require adapter injection

- HttpSchemaOptions.adapter type changed to Adapter interface
- Removed FetchAdapter/AxiosAdapter hard dependencies
- Added adapter required validation with clear error message
- Updated tests to pass adapter instance

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|-----------------|------|
| types.ts adapter type → Adapter | Step 3 |
| index.ts remove FetchAdapter/AxiosAdapter imports | Step 4 |
| index.ts adapter required check | Step 4 |
| package.json remove 2 adapter deps | Step 5 |
| index.spec.ts update tests | Step 1 |
| adapter 未传时抛错 | Step 1 (test) + Step 4 (implementation) |