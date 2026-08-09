# http-schema
> A parser for HTTP schema DSL, supporting RESTful APIs and path parsing.

[![version][version-image]][version-url]
[![license][license-image]][license-url]
[![download][download-image]][download-url]

## installation
```shell
yarn add @jswork/http-schema
```

## usage

### 1. Define your API schema

```js
// schema.ts
export default {
  baseURL: import.meta.env.VITE_API_URL,
  request: ['/api', 'json'],
  items: [
    {
      request: ['/rails_jwt_admin', 'json'],
      items: {
        login: ['post', '/auth'],
        profile: ['get', '/me']
      }
    },
    {
      resources: ['badges', 'posts'],
      items: {
        badges_top: ['get', '/badges/top?limit=100'],
        categories_root: ['get', '/categories/root', { tags: ['ni2lv'] }]
      }
    }
  ]
};
```

### 2. Create API instance

```js
import httpSchema from '@jswork/http-schema';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';
import schema from './schema';

const api = httpSchema(schema, {
  adapter: new FetchAdapter(),
  interceptors: [authInterceptor],
  transformResponse: (res) => res.data
});

// Use the API
await api.login({ username: 'admin', password: 'xxx' });
await api.badges_index({ page: 1 });
await api.badges_show({ id: 123 });
await api.badges_create({ title: 'new badge' });
```

### Typed API (多业务线同构接口)

当业务存在多套同构 API（如研究生/本科接口路径不同、结构相同）时，用 `type` 分组 + `resolveType` 实现统一调用入口。

```js
// schema.ts —— type 分组，叶子统一用原始 key，无需 prefix
export default {
  baseURL: '/api',
  items: [
    {
      type: 'graduate',
      request: ['/api/v1', 'json'],
      items: {
        get_user_collects: ['get', '/apply7/resume/get_user_programs'],
        hot_schools: ['get', '/recommend/hot_program_universities'],
      }
    },
    {
      type: 'undergraduate',
      request: ['/api/v1', 'json'],
      items: {
        get_user_collects: ['get', '/recommend/get_user_colleges'],
        hot_schools: ['get', '/recommend/hot_major_colleges'],
      }
    },
  ]
};
```

```js
// api.ts —— resolveType 返回当前业务类型
const api = httpSchema(schema, {
  adapter: new FetchAdapter(),
  resolveType: () => getUserType(),  // 'graduate' | 'undergraduate'
});

// 统一调用，自动路由到当前 type 的路径
const collects = await api.typed('get_user_collects')({ userId: 1 });
// resolveType='graduate'      → /api/v1/apply7/resume/get_user_programs
// resolveType='undergraduate' → /recommend/get_user_colleges
```

**规则：**
- `type` 与 `request`/`prefix` 同级，标识业务类型
- type 分组内叶子用原始 key，无需 prefix/suffix（路径由 `request[0]` 拼接）
- `api.typed(key)(data, options)` 每次调用执行 `resolveType` 动态路由
- 普通分组完全不受影响，仍在 `api` 上平铺

### DSL rules

| Rule | Description |
|------|-------------|
| items 二态 | 数组=子分组节点；对象=接口叶子，key 为接口函数名 |
| request | `[prefix, format]` — 分组层级前缀，向下继承，`format` 映射到 `dataType` |
| resources | 自动生成 RESTful 5个接口：`_index/_show/_create/_update/_destroy` |
| 接口简写 | `name: [method, path, meta?]`，meta 支持 tags 等扩展 |
| type | 分组级标识业务类型，叶子用原始 key，配合 resolveType 实现动态路由 |
| path 占位符 | 支持 `{id}` 路径占位符，由 `path-dual-parser` 替换 |
| path 拼接 | 路径始终拼接分组前缀栈（不以 `/` 跳过） |
| baseURL | 全局继承，支持分组内覆盖 |
| type | 分组级标识业务类型，叶子用原始 key，配合 resolveType 实现动态路由 |
| prefix/suffix | 作用于函数名，支持分组内覆盖（type 分组内不生效） |

## API

```ts
httpSchema(schema, options): ApiInstance
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| adapter | `Adapter` | required | HTTP adapter instance (e.g. `new FetchAdapter()`) |
| baseURL | `string` | schema.baseURL | Base URL for all requests |
| dataType | `DataType` | schema request[1] | Default data serialization type |
| interceptors | `InterceptorLike[]` | - | Universal-request interceptors |
| transformResponse | `(res) => any` | - | Transform response before returning |
| resolveType | `(data?, options?) => string` | - | Typed API 路由函数，返回当前业务类型 |

## Schema Types

```ts
// Leaf endpoint: [method, path, meta?]
type HttpSchemaLeaf = [method: string, path: string, meta?: Record<string, any>];

// Resource definition
interface ResourceDef {
  name: string;
  prefix?: string;
  only?: string[];
  except?: string[];
}

// DSL config
interface HttpSchemaConfig {
  baseURL?: string;
  request?: [string, DataType];
  items?: HttpSchemaItem[] | Record<string, HttpSchemaLeaf>;
}

// Group item (in items array) supports type
// { type?: string; request?: [string, DataType]; prefix?: string; items?: ... }
```

## Monorepo Structure

```
http-schema/
├── packages/
│   └── core/          # Core library (@jswork/http-schema)
│       ├── src/       # Source code
│       ├── __tests__/ # Tests
│       └── package.json
├── apps/
│   └── example/       # Demo application (Vite + React)
└── docs/              # Specifications and design docs
```

## license
Code released under [the MIT license](https://github.com/afeiship/http-schema/blob/main/LICENSE.txt).

[version-image]: https://img.shields.io/npm/v/@jswork/http-schema
[version-url]: https://npmjs.org/package/@jswork/http-schema

[license-image]: https://img.shields.io/npm/l/@jswork/http-schema
[license-url]: https://github.com/afeiship/http-schema/blob/main/LICENSE.txt

[download-image]: https://img.shields.io/npm/dm/@jswork/http-schema
[download-url]: https://www.npmjs.com/package/@jswork/http-schema