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

### DSL rules

| Rule | Description |
|------|-------------|
| items 二态 | 数组=子分组节点；对象=接口叶子，key 为接口函数名 |
| request | `[prefix, format]` — 分组层级前缀，向下继承，`format` 映射到 `dataType` |
| resources | 自动生成 RESTful 5个接口：`_index/_show/_create/_update/_destroy` |
| 接口简写 | `name: [method, path, meta?]`，meta 支持 tags 等扩展 |
| path 占位符 | 支持 `{id}` 路径占位符，由 `path-dual-parser` 替换 |
| path 拼接 | 路径始终拼接分组前缀栈（不以 `/` 跳过） |
| baseURL | 全局继承，支持分组内覆盖 |
| prefix/suffix | 作用于函数名，支持分组内覆盖 |

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