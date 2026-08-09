# http-schema

> A parser for HTTP schema DSL, supporting RESTful APIs and path parsing.

[![version][version-image]][version-url]
[![license][license-image]][license-url]
[![download][download-image]][download-url]

## Installation

```shell
yarn add @jswork/http-schema
```

## Quick Start

```js
// 1. Define your API schema
// schema.ts
export default {
  baseURL: '/api',
  request: ['', 'json'],
  items: [
    { resources: ['badges'] },
    {
      request: ['/v1', 'json'],
      items: { profile: ['get', '/me'] }
    }
  ]
};

// 2. Create API instance
// api.ts
import httpSchema from '@jswork/http-schema';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';
import schema from './schema';

const api = httpSchema(schema, {
  adapter: new FetchAdapter(),
});

// 3. Use the API
await api.badges_index();       // GET /api/badges
await api.badges_show({ id: 1 });  // GET /api/badges/1
await api.profile();            // GET /api/v1/me
```

## Features

| # | Doc | Description |
|---|-----|-------------|
| 01 | [Basic Usage](docs/features/01-basic-usage.md) | DSL 定义 & 创建 API 实例 |
| 02 | [RESTful Resources](docs/features/02-restful-resources.md) | CRUD 自动生成 |
| 03 | [Typed API](docs/features/03-typed-api.md) | 多业务线同构接口 |
| 04 | [Path Params](docs/features/04-path-params.md) | 路径占位符 `{id}` / `:param` |
| 05 | [Prefix & Suffix](docs/features/05-prefix-suffix.md) | 函数名前缀/后缀 |
| 06 | [Interceptors](docs/features/06-interceptors.md) | 请求拦截器 & transformResponse |
| 07 | [Schema Config](docs/features/07-schema-config.md) | 完整配置项参考 |
| 08 | [DSL Rules](docs/features/08-dsl-rules.md) | 全套 DSL 规则参考 |

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
└── docs/              # Specifications, plans, and feature docs
```

## License

Code released under [the MIT license](https://github.com/afeiship/http-schema/blob/main/LICENSE.txt).

[version-image]: https://img.shields.io/npm/v/@jswork/http-schema
[version-url]: https://npmjs.org/package/@jswork/http-schema

[license-image]: https://img.shields.io/npm/l/@jswork/http-schema
[license-url]: https://github.com/afeiship/http-schema/blob/main/LICENSE.txt

[download-image]: https://img.shields.io/npm/dm/@jswork/http-schema
[download-url]: https://www.npmjs.com/package/@jswork/http-schema