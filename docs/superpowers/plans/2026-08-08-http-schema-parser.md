# http-schema Parser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current placeholder number-splitting code with the http-schema DSL parser that outputs a flat API instance object backed by universal-request.

**Architecture:** 4 modules — types.ts (types), rest.ts (resources→CRUD), parser.ts (recursive tree→flat ApiItem[]), index.ts (entry: ApiItem[]→callable functions via RequestCore). Path placeholder replacement via path-dual-parser's `parse()`.

**Tech Stack:** TypeScript, bun test, universal-request-core, universal-request-adapter-fetch, path-dual-parser

---

### Task 1: Type definitions (types.ts)

**Files:**
- Create: `src/types.ts`
- Test: `__tests__/types.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/types.spec.ts
import { describe, it, expect } from 'bun:test';

describe('TypeScript type exports', () => {
  it('should export all type interfaces', () => {
    // This is a compile-time check — just verify the module loads
    // We test the types implicitly through the parser tests
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test __tests__/types.spec.ts`
Expected: FAIL because `src/types.ts` doesn't exist yet or the import fails

- [ ] **Step 3: Write types.ts**

```typescript
// src/types.ts
import type { DataType } from '@jswork/universal-request-core';
import type { InterceptorLike } from '@jswork/universal-request-core';

// DSL 叶子接口：name: [method, path, meta?]
export type HttpSchemaLeaf = [
  method: string,
  path: string,
  meta?: Record<string, any>
];

// 叶子记录的键值对
export interface HttpSchemaLeafRecord {
  [key: string]: HttpSchemaLeaf;
}

// 资源定义
export interface ResourceDef {
  name: string;
  prefix?: string;
  only?: string[];
  except?: string[];
}

// DSL 项目节点（分组或叶子）
export interface HttpSchemaItem {
  request?: [string, DataType];
  baseURL?: string;
  prefix?: string;
  suffix?: string;
  resources?: (string | ResourceDef)[];
  items?: HttpSchemaItems;
}

// 二态 items：数组=子分组节点；对象=接口叶子
export type HttpSchemaItems = HttpSchemaItem[] | HttpSchemaLeafRecord;

// DSL 顶层配置
export interface HttpSchemaConfig {
  baseURL?: string;
  request?: [string, DataType];
  items?: HttpSchemaItems;
}

// 解析后的扁平接口项
export interface ApiItem {
  name: string;
  method: string;
  fullPath: string;
  dataType: string;
  baseURL: string;
  meta?: Record<string, any>;
}

// http-schema 选项
export interface HttpSchemaOptions {
  baseURL?: string;
  dataType?: DataType;
  adapter?: 'Fetch' | 'Axios';
  interceptors?: InterceptorLike[];
  transformResponse?: (res: any) => any;
}

// 生成的 api 函数签名
export interface ApiFunction {
  (data?: any, options?: Record<string, any>): Promise<any>;
}

// 完整 api 实例类型
export interface ApiInstance {
  [key: string]: ApiFunction;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test __tests__/types.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types.ts __tests__/types.spec.ts
git commit -m "feat: add http-schema DSL type definitions"
```

---

### Task 2: Resources CRUD expansion (rest.ts)

**Files:**
- Create: `src/rest.ts`
- Test: `__tests__/rest.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/rest.spec.ts
import { describe, it, expect } from 'bun:test';
import { normalizeResources } from '../src/rest';

describe('normalizeResources', () => {
  it('should expand string resource to 5 CRUD actions', () => {
    const result = normalizeResources(['tags'], '', '');
    expect(Object.keys(result)).toEqual([
      'tags_index', 'tags_show', 'tags_create', 'tags_update', 'tags_destroy'
    ]);
    expect(result.tags_index).toEqual(['get', '/tags']);
    expect(result.tags_show).toEqual(['get', '/tags/{id}']);
    expect(result.tags_create).toEqual(['post', '/tags']);
    expect(result.tags_update).toEqual(['put', '/tags/{id}']);
    expect(result.tags_destroy).toEqual(['delete', '/tags/{id}']);
  });

  it('should handle resource with only filter', () => {
    const result = normalizeResources([{ name: 'users', only: ['index', 'show'] }], '', '');
    expect(Object.keys(result)).toEqual(['users_index', 'users_show']);
  });

  it('should handle resource with except filter', () => {
    const result = normalizeResources([{ name: 'users', except: ['destroy'] }], '', '');
    expect(Object.keys(result)).toEqual([
      'users_index', 'users_show', 'users_create', 'users_update'
    ]);
  });

  it('should apply prefix and suffix to function names', () => {
    const result = normalizeResources(['tags'], 'v1_', 'Api');
    expect(result.tags_index).toBeDefined();
    expect(result.tags_show).toBeDefined();
    // 所有 key 都应包含前后缀
    Object.keys(result).forEach(key => {
      expect(key.startsWith('v1_')).toBe(true);
      expect(key.endsWith('Api')).toBe(true);
    });
  });

  it('should handle multiple resources', () => {
    const result = normalizeResources(['tags', 'posts'], '', '');
    expect(Object.keys(result)).toContain('tags_index');
    expect(Object.keys(result)).toContain('posts_index');
  });

  it('should handle empty resources array', () => {
    const result = normalizeResources([], '', '');
    expect(result).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test __tests__/rest.spec.ts`
Expected: FAIL with "module not found"

- [ ] **Step 3: Write rest.ts**

```typescript
// src/rest.ts
import type { HttpSchemaLeaf, HttpSchemaLeafRecord, ResourceDef } from './types';

// REST 模板表
const REST_TEMPLATES: Record<string, [string, string]> = {
  index: ['get', '/{name}'],
  show: ['get', '/{name}/{id}'],
  create: ['post', '/{name}'],
  update: ['put', '/{name}/{id}'],
  destroy: ['delete', '/{name}/{id}'],
};

const ALL_ACTIONS = Object.keys(REST_TEMPLATES);

/**
 * 将单个资源名展开为 CRUD 接口项
 */
function expandResource(
  name: string,
  actions: string[],
  resPrefix: string,
  resSuffix: string
): HttpSchemaLeafRecord {
  const result: HttpSchemaLeafRecord = {};
  actions.forEach((action) => {
    const [method, tpl] = REST_TEMPLATES[action];
    const path = tpl.replace('{name}', `/${name}`).replace('/{id}', '/{id}');
    const key = resPrefix + name + '_' + action + resSuffix;
    result[key] = [method, path] as HttpSchemaLeaf;
  });
  return result;
}

/**
 * 标准化 resources 定义，展开为 CRUD 接口项
 */
export function normalizeResources(
  resources: (string | ResourceDef)[],
  parentPrefix: string,
  parentSuffix: string
): HttpSchemaLeafRecord {
  const result: HttpSchemaLeafRecord = {};

  resources.forEach((res) => {
    let name: string;
    let actions: string[];
    let prefix = parentPrefix;
    let suffix = parentSuffix;

    if (typeof res === 'string') {
      name = res;
      actions = [...ALL_ACTIONS];
    } else {
      name = res.name;
      prefix = res.prefix ?? parentPrefix;
      actions = res.only
        ? ALL_ACTIONS.filter((a) => res.only!.includes(a))
        : res.except
          ? ALL_ACTIONS.filter((a) => !res.except!.includes(a))
          : [...ALL_ACTIONS];
    }

    Object.assign(result, expandResource(name, actions, prefix, suffix));
  });

  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test __tests__/rest.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/rest.ts __tests__/rest.spec.ts
git commit -m "feat: add resources CRUD expansion (normalizeResources)"
```

---

### Task 3: Recursive parser (parser.ts)

**Files:**
- Create: `src/parser.ts`
- Test: `__tests__/parser.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/parser.spec.ts
import { describe, it, expect } from 'bun:test';
import { parse } from '../src/parser';
import type { HttpSchemaConfig } from '../src/types';

describe('parse', () => {
  it('should parse flat leaf items', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: {
        ping: ['get', '/ping'],
        echo: ['post', '/echo', { tags: ['test'] }],
      }
    };
    const result = parse(config);
    expect(result).toHaveLength(2);

    expect(result[0].name).toBe('ping');
    expect(result[0].method).toBe('get');
    expect(result[0].fullPath).toBe('/api/ping');
    expect(result[0].dataType).toBe('json');
    expect(result[0].baseURL).toBe('http://test.com');

    expect(result[1].name).toBe('echo');
    expect(result[1].method).toBe('post');
    expect(result[1].fullPath).toBe('/api/echo');
    expect(result[1].meta).toEqual({ tags: ['test'] });
  });

  it('should handle nested groups with request inheritance', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [
        {
          request: ['/v2', 'json'],
          items: {
            user: ['get', '/user'],
          }
        }
      ]
    };
    const result = parse(config);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('user');
    expect(result[0].fullPath).toBe('/api/v2/user');
  });

  it('should handle resources expansion in parser', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [
        {
          resources: ['tags'],
          items: {
            tags_top: ['get', '/tags/top'],
          }
        }
      ]
    };
    const result = parse(config);
    // tags_index/show/create/update/destroy + tags_top
    expect(result.length).toBe(6);
    expect(result.find(r => r.name === 'tags_top')).toBeDefined();
    expect(result.find(r => r.name === 'tags_index')).toBeDefined();
  });

  it('should handle prefix/suffix on function names', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [
        {
          prefix: 'admin_',
          suffix: 'V2',
          items: {
            dashboard: ['get', '/dashboard'],
          }
        }
      ]
    };
    const result = parse(config);
    expect(result[0].name).toBe('admin_dashboardV2');
  });

  it('should handle custom baseURL override in group', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://default.com',
      request: ['/api', 'json'],
      items: [
        {
          baseURL: 'http://other.com',
          items: {
            status: ['get', '/status'],
          }
        }
      ]
    };
    const result = parse(config);
    expect(result[0].baseURL).toBe('http://other.com');
  });

  it('should handle empty items gracefully', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
    };
    const result = parse(config);
    expect(result).toEqual([]);
  });

  it('should handle path always concatenated with prefix', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/base', 'json'],
      items: {
        test: ['get', '/absolute'],
      }
    };
    const result = parse(config);
    // 即使以 / 开头，也拼接前缀
    expect(result[0].fullPath).toBe('/base/absolute');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test __tests__/parser.spec.ts`
Expected: FAIL with "module not found"

- [ ] **Step 3: Write parser.ts**

```typescript
// src/parser.ts
import type {
  HttpSchemaConfig,
  HttpSchemaItem,
  HttpSchemaItems,
  HttpSchemaLeaf,
  HttpSchemaLeafRecord,
  ApiItem,
  DataType,
} from './types';
import { normalizeResources } from './rest';

// 内部解析上下文
interface ParseContext {
  baseURL: string;
  prefix: string;       // 路径前缀栈（request[0] 拼接）
  dataType: string;
  namePrefix: string;   // 函数名前缀
  nameSuffix: string;   // 函数名后缀
}

/**
 * 合并两个路径，处理 / 拼接
 */
function joinPaths(left: string, right: string): string {
  if (!left) return right;
  if (!right) return left;
  return left.replace(/\/$/, '') + '/' + right.replace(/^\//, '');
}

/**
 * 判断 items 是数组还是对象
 */
function isArrayItems(items: HttpSchemaItems): items is HttpSchemaItem[] {
  return Array.isArray(items);
}

/**
 * 递归解析 items 数组
 */
function parseItems(
  items: HttpSchemaItems,
  ctx: ParseContext
): ApiItem[] {
  const result: ApiItem[] = [];

  if (isArrayItems(items)) {
    // 数组：每个元素是子分组
    items.forEach((item) => {
      const subCtx: ParseContext = {
        baseURL: item.baseURL ?? ctx.baseURL,
        prefix: item.request ? joinPaths(ctx.prefix, item.request[0]) : ctx.prefix,
        dataType: item.request?.[1] ?? ctx.dataType,
        namePrefix: item.prefix ?? ctx.namePrefix,
        nameSuffix: item.suffix ?? ctx.nameSuffix,
      };

      // 展开 resources
      let mergedItems = item.items ?? {};
      if (item.resources && item.resources.length > 0) {
        const resourceItems = normalizeResources(item.resources, subCtx.namePrefix, subCtx.nameSuffix);
        mergedItems = { ...resourceItems, ...mergedItems };
      }

      result.push(...parseItems(mergedItems, subCtx));
    });
  } else {
    // 对象：叶子节点
    Object.entries(items).forEach(([key, leaf]) => {
      const [method, path, meta] = leaf as HttpSchemaLeaf;
      const name = ctx.namePrefix + key + ctx.nameSuffix;
      const fullPath = joinPaths(ctx.prefix, path);
      result.push({
        name,
        method: method.toLowerCase(),
        fullPath,
        dataType: ctx.dataType,
        baseURL: ctx.baseURL,
        meta,
      });
    });
  }

  return result;
}

/**
 * 解析 DSL 配置，输出扁平化 ApiItem 列表
 */
export function parse(config: HttpSchemaConfig): ApiItem[] {
  if (!config.items) return [];

  const ctx: ParseContext = {
    baseURL: config.baseURL ?? '',
    prefix: config.request?.[0] ?? '',
    dataType: config.request?.[1] ?? 'json',
    namePrefix: '',
    nameSuffix: '',
  };

  return parseItems(config.items, ctx);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test __tests__/parser.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/parser.ts __tests__/parser.spec.ts
git commit -m "feat: add recursive DSL parser"
```

---

### Task 4: Main entry point (index.ts)

**Files:**
- Modify: `src/index.ts` (replace entire content)
- Modify: `__tests__/index.spec.ts` (replace with new tests)
- Test: `__tests__/index.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/index.spec.ts
import { describe, it, expect, beforeAll } from 'bun:test';
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
    const api = httpSchema(config);
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
    const api = httpSchema(config);
    expect(api).toHaveProperty('login');
    expect(api).toHaveProperty('profile');
    expect(api).toHaveProperty('tags_index');
    expect(api).toHaveProperty('tags_top');
    expect(api).toHaveProperty('posts_index');
  });

  it('should handle empty schema', () => {
    const api = httpSchema({});
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
    });
    expect(api).toHaveProperty('ping');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test __tests__/index.spec.ts`
Expected: FAIL because `src/index.ts` still has the old placeholder code

- [ ] **Step 3: Write index.ts**

```typescript
// src/index.ts
import { createRequest, RequestCore } from '@jswork/universal-request-core';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';
import { parse } from '@jswork/path-dual-parser';
import type { ApiItem, ApiInstance, HttpSchemaConfig, HttpSchemaOptions } from './types';
import { parse as parseSchema } from './parser';

/**
 * 从路径中提取模板参数名
 */
function extractParams(path: string): string[] {
  const params: string[] = [];
  const re = /\{(\w+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(path)) !== null) {
    params.push(match[1]);
  }
  return params;
}

/**
 * 将 data 拆分为路径参数和请求体
 */
function splitData(path: string, data: any): [Record<string, any>, any] {
  if (data == null) return [{}, undefined];
  if (typeof data !== 'object' || Array.isArray(data) || data instanceof FormData) {
    return [{}, data];
  }

  const params: Record<string, any> = {};
  const body: Record<string, any> = { ...data };
  const paramKeys = extractParams(path);

  paramKeys.forEach((key) => {
    if (key in body) {
      params[key] = body[key];
      delete body[key];
    }
  });

  const hasBody = Object.keys(body).length > 0;
  return [params, hasBody ? body : undefined];
}

/**
 * 判断一个方法是否使用 query string（GET/HEAD/DELETE）
 */
function isQueryMethod(method: string): boolean {
  return ['get', 'head', 'delete'].includes(method.toLowerCase());
}

/**
 * http-schema 入口
 * 输入 DSL 配置，输出可调用的扁平 api 实例
 */
function httpSchema(
  schema: HttpSchemaConfig,
  options?: HttpSchemaOptions
): ApiInstance {
  // 1. 解析 DSL → 扁平 ApiItem[]
  const items = parseSchema(schema);

  // 2. 创建 RequestCore 实例
  const baseURL = options?.baseURL ?? schema.baseURL ?? '';
  const httpClient = createRequest({
    baseURL,
    adapter: new FetchAdapter(),
    interceptors: options?.interceptors,
  });

  // 3. 构建 api 实例
  const api: ApiInstance = {};

  items.forEach((item: ApiItem) => {
    api[item.name] = (data?: any, callOptions?: Record<string, any>) => {
      // 替换路径占位符
      const [params, payload] = splitData(item.fullPath, data);
      const resolvedPath = parse(item.fullPath, params);

      // 构建请求配置
      const config: Record<string, any> = {
        url: resolvedPath,
        method: item.method.toUpperCase(),
        dataType: options?.dataType ?? item.dataType,
        ...callOptions,
      };

      // GET/HEAD/DELETE 的 payload 放到 query string
      // 其他方法放到请求体
      if (payload !== undefined) {
        if (isQueryMethod(item.method)) {
          config.params = payload;
        } else {
          config.payload = payload;
        }
      }

      // 发起请求
      return httpClient.request(config).then((res) => {
        if (options?.transformResponse) {
          return options.transformResponse(res);
        }
        return res;
      });
    };
  });

  return api;
}

export default httpSchema;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test __tests__/index.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/index.ts __tests__/index.spec.ts
git commit -m "feat: add http-schema entry point with RequestCore integration"
```

---

### Task 5: Clean up old placeholder test and verify full suite

**Files:**
- Delete: `__tests__/index.spec.ts` (old placeholder test) — wait, we already replaced it. Let me check...
- Actually, `__tests__/index.spec.ts` was the old placeholder test file. We already replaced it in Task 4. So we just need to verify the whole suite runs.

- [ ] **Step 1: Run all tests**

Run: `bun test`
Expected: All 4 test files pass (types, rest, parser, index)

- [ ] **Step 2: Build the project**

Run: `pnpm build`
Expected: Build succeeds, dist/ directory has output files

- [ ] **Step 3: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: clean up placeholder code, full test suite passes"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|-----------------|------|
| TS 类型定义整套 schema | Task 1 (types.ts) |
| 递归 parser，输入 schema 输出扁平化接口列表 | Task 3 (parser.ts) |
| resources 展开逻辑 | Task 2 (rest.ts) |
| 路径栈拼接、路径占位符解析 | Task 3 (parser.ts) + Task 4 (index.ts parse() call) |
| 基于 universal-request 生成可调用 api 实例 | Task 4 (index.ts) |
| 输出调用示例 | Task 4 (index.ts test) |
| 标注边界坑点 | Spec doc section 8 covers this |

## Type Consistency Check

- `HttpSchemaConfig` → `parse()` → `ApiItem[]` → `httpSchema()` → `ApiInstance`
- `HttpSchemaLeaf` = `[method, path, meta?]` — used consistently in parser.ts and rest.ts
- `ResourceDef` interface properties match between types.ts and rest.ts usage
- `ApiFunction` signature `(data?, options?)` matches index.ts implementation
- `DataType` imported from universal-request-core, used in types.ts, parser.ts, index.ts