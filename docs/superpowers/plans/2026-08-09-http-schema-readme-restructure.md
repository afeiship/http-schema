# README 重构 & features 特性文档 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 README 中的详细特性说明拆分为 `docs/features/01-xx` 独立文档，README 只保留安装 + 最小示例 + features 索引

**Architecture:** 纯文档重构，不涉及核心代码改动。8 个特性文件 + 1 个 README 重写，共 9 个文件变更。

**Tech Stack:** Markdown

---

### Task 1: 创建 docs/features/01-basic-usage.md

**Files:**
- Create: `docs/features/01-basic-usage.md`

- [ ] **Step 1: 创建文件**

```bash
mkdir -p docs/features
```

- [ ] **Step 2: 写入内容**

```markdown
---
name: Basic Usage
description: DSL 基本定义与创建 API 实例
---

## 用法

```js
// schema.ts
export default {
  baseURL: '/api',
  request: ['', 'json'],
  items: [
    {
      request: ['/rails_jwt_admin', 'json'],
      items: {
        login: ['post', '/auth'],
        profile: ['get', '/me']
      }
    }
  ]
};

// api.ts
import httpSchema from '@jswork/http-schema';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';
import schema from './schema';

const api = httpSchema(schema, {
  adapter: new FetchAdapter(),
  transformResponse: (res) => res.data
});

// 调用
await api.login({ username: 'admin', password: 'xxx' });
await api.profile();
```

## 规则

- `items` 为数组时，每个元素是子分组节点，可嵌套 `request`/`items`/`resources`
- `items` 为对象时，键为接口函数名，值为 `[method, path, config?]` 元组
- 分组 `request` 的路径前缀会向下继承，与子路径拼接
- `baseURL` 全局继承，分组内可覆盖

## 参考

- [RESTful Resources](02-restful-resources.md)
- [Path Params](04-path-params.md)
- [Prefix & Suffix](05-prefix-suffix.md)
```

- [ ] **Step 3: Commit**

```bash
git add docs/features/01-basic-usage.md
git commit -m "docs(features): add basic usage feature doc"
```

---

### Task 2: 创建 docs/features/02-restful-resources.md

**Files:**
- Create: `docs/features/02-restful-resources.md`

- [ ] **Step 1: 写入内容**

```markdown
---
name: RESTful Resources
description: resources 数组自动生成 CRUD 接口
---

## 用法

```js
// schema.ts
export default {
  baseURL: '/api',
  request: ['', 'json'],
  items: [
    {
      resources: ['badges', 'posts'],
      items: {
        badges_top: ['get', '/badges/top?limit=100']
      }
    }
  ]
};

// 自动生成 5 个接口
await api.badges_index();    // GET  /api/badges
await api.badges_show({ id: 1 });   // GET  /api/badges/1
await api.badges_create({ title: 'new' }); // POST /api/badges
await api.badges_update({ id: 1, title: 'upd' }); // PUT  /api/badges/1
await api.badges_destroy({ id: 1 });  // DELETE /api/badges/1
```

## 规则

| 接口名 | 方法 | 路径 |
|--------|------|------|
| `{name}_index` | GET | `/{name}` |
| `{name}_show` | GET | `/{name}/{id}` |
| `{name}_create` | POST | `/{name}` |
| `{name}_update` | PUT | `/{name}/{id}` |
| `{name}_destroy` | DELETE | `/{name}/{id}` |

- `resources` 支持字符串数组（自动生成全部 5 个接口）
- 也支持对象数组，可指定 `only`/`except` 筛选操作

```js
resources: [
  { name: 'badges', only: ['index', 'show'] },
  { name: 'posts', except: ['destroy'] }
]
```

## 参考

- [Basic Usage](01-basic-usage.md)
- [Path Params](04-path-params.md)
```

- [ ] **Step 2: Commit**

```bash
git add docs/features/02-restful-resources.md
git commit -m "docs(features): add RESTful resources feature doc"
```

---

### Task 3: 创建 docs/features/03-typed-api.md

**Files:**
- Create: `docs/features/03-typed-api.md`

- [ ] **Step 1: 写入内容**

```markdown
---
name: Typed API
description: 多业务线同构接口，通过 type 分组 + resolveType 动态路由
---

## 用法

```js
// schema.ts —— type 分组，叶子统一用原始 key
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

## 规则

- `type` 与 `request`/`prefix` 同级，标识业务类型
- type 分组内叶子用原始 key，无需 prefix/suffix（路径由 `request[0]` 拼接）
- `api.typed(key)(data, options)` 每次调用执行 `resolveType` 动态路由
- 普通分组完全不受影响，仍在 `api` 上平铺

## 参考

- [Basic Usage](01-basic-usage.md)
```

- [ ] **Step 2: Commit**

```bash
git add docs/features/03-typed-api.md
git commit -m "docs(features): add typed API feature doc"
```

---

### Task 4: 创建 docs/features/04-path-params.md

**Files:**
- Create: `docs/features/04-path-params.md`

- [ ] **Step 1: 写入内容**

```markdown
---
name: Path Params
description: 路径占位符 {id} / :param 自动替换
---

## 用法

```js
// schema.ts
export default {
  baseURL: '/api',
  request: ['', 'json'],
  items: {
    user: ['get', '/users/{id}'],
    post: ['get', '/posts/:id/comments']
  }
};

// 调用时传入占位符值
await api.user({ id: 123 });    // GET /api/users/123
await api.post({ id: 456 });    // GET /api/posts/456/comments
```

## 规则

- 支持 `{param}` 和 `:param` 两种语法
- 占位符值从请求 data 中提取，剩余字段作为请求体
- GET/HEAD/DELETE 时剩余字段作为 query string

## 参考

- [Basic Usage](01-basic-usage.md)
- [RESTful Resources](02-restful-resources.md)
```

- [ ] **Step 2: Commit**

```bash
git add docs/features/04-path-params.md
git commit -m "docs(features): add path params feature doc"
```

---

### Task 5: 创建 docs/features/05-prefix-suffix.md

**Files:**
- Create: `docs/features/05-prefix-suffix.md`

- [ ] **Step 1: 写入内容**

```markdown
---
name: Prefix & Suffix
description: 函数名前缀/后缀，支持分组内覆盖
---

## 用法

```js
// schema.ts
export default {
  baseURL: '/api',
  request: ['', 'json'],
  items: [
    {
      prefix: 'v1_',
      items: {
        me: ['get', '/me'],
        profile: ['get', '/profile']
      }
    },
    {
      prefix: 'admin_',
      suffix: '_v2',
      items: {
        users: ['get', '/users']
      }
    }
  ]
};

// 生成的函数名
await api.v1_me();        // GET /api/me
await api.v1_profile();   // GET /api/profile
await api.admin_users_v2(); // GET /api/users
```

## 规则

- `prefix` 追加到函数名开头，`suffix` 追加到函数名末尾
- 支持分组内覆盖，子分组继承父分组的前缀/后缀
- type 分组内 prefix/suffix 不生效（叶子用原始 key）

## 参考

- [Basic Usage](01-basic-usage.md)
- [Typed API](03-typed-api.md)
```

- [ ] **Step 2: Commit**

```bash
git add docs/features/05-prefix-suffix.md
git commit -m "docs(features): add prefix/suffix feature doc"
```

---

### Task 6: 创建 docs/features/06-interceptors.md

**Files:**
- Create: `docs/features/06-interceptors.md`

- [ ] **Step 1: 写入内容**

```markdown
---
name: Interceptors
description: 请求拦截器与响应转换
---

## 用法

```js
import httpSchema from '@jswork/http-schema';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';

const api = httpSchema(schema, {
  adapter: new FetchAdapter(),
  transformResponse: (res) => res.data,
  interceptors: [
    {
      request: (config) => {
        config.headers = { ...config.headers, Authorization: 'Bearer xxx' };
        return config;
      },
      response: (res) => {
        console.log('response:', res);
        return res;
      }
    }
  ]
});
```

## 规则

- `interceptors` 支持 `request` 和 `response` 钩子
- `request` 拦截器在发送前执行，可修改请求配置
- `response` 拦截器在收到响应后执行
- `transformResponse` 全局转换响应数据，在 interceptor 之后执行

## 参考

- [Basic Usage](01-basic-usage.md)
- [Schema Config](07-schema-config.md)
```

- [ ] **Step 2: Commit**

```bash
git add docs/features/06-interceptors.md
git commit -m "docs(features): add interceptors feature doc"
```

---

### Task 7: 创建 docs/features/07-schema-config.md

**Files:**
- Create: `docs/features/07-schema-config.md`

- [ ] **Step 1: 写入内容**

```markdown
---
name: Schema Config
description: httpSchema 完整配置项参考
---

## Options

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| adapter | `Adapter` | 必填 | HTTP 适配器（如 `new FetchAdapter()`） |
| baseURL | `string` | schema.baseURL | 全局基础 URL |
| dataType | `DataType` | schema request[1] | 默认数据序列化类型 |
| interceptors | `InterceptorLike[]` | - | 请求拦截器数组 |
| transformResponse | `(res) => any` | - | 全局响应转换函数 |
| resolveType | `(data?, options?) => string` | - | 动态路由函数，返回当前业务类型 |

## Config 字段（叶子级）

叶子接口的第三个参数 `[method, path, config?]` 支持以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| tags | `string[]` | 标签标记，可用于拦截器筛选 |
| meta | `Record<string, any>` | 自定义元数据 |
| 其他 | `RequestConfig` 字段 | 透传到 universal-request |

## 参考

- [Interceptors](06-interceptors.md)
- [Typed API](03-typed-api.md)
```

- [ ] **Step 2: Commit**

```bash
git add docs/features/07-schema-config.md
git commit -m "docs(features): add schema config reference doc"
```

---

### Task 8: 创建 docs/features/08-dsl-rules.md

**Files:**
- Create: `docs/features/08-dsl-rules.md`

- [ ] **Step 1: 写入内容**

```markdown
---
name: DSL Rules
description: http-schema DSL 完整规则参考
---

## 规则

| 规则 | 说明 |
|------|------|
| items 二态 | 数组=子分组节点；对象=接口叶子，key 为接口函数名 |
| request | `[prefix, format]` — 分组层级前缀，向下继承，`format` 映射到 `dataType` |
| resources | 自动生成 RESTful 5 个接口：`_index/_show/_create/_update/_destroy` |
| 接口简写 | `name: [method, path, meta?]`，meta 支持 tags 等扩展 |
| type | 分组级标识业务类型，叶子用原始 key，配合 resolveType 实现动态路由 |
| path 占位符 | 支持 `{id}` 和 `:param` 路径占位符，由 `path-dual-parser` 替换 |
| path 拼接 | 路径始终拼接分组前缀栈 |
| baseURL | 全局继承，支持分组内覆盖 |
| prefix/suffix | 作用于函数名，支持分组内覆盖（type 分组内不生效） |
| config | 分组级配置，向下继承，叶子级可覆盖 |

## 参考

- [Basic Usage](01-basic-usage.md)
- [RESTful Resources](02-restful-resources.md)
- [Typed API](03-typed-api.md)
- [Path Params](04-path-params.md)
- [Prefix & Suffix](05-prefix-suffix.md)
- [Schema Config](07-schema-config.md)
```

- [ ] **Step 2: Commit**

```bash
git add docs/features/08-dsl-rules.md
git commit -m "docs(features): add DSL rules reference doc"
```

---

### Task 9: 重写 README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 重写 README.md**

```markdown
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
await api.badges_index();     // GET /api/badges
await api.badges_show({ id: 1 });  // GET /api/badges/1
await api.profile();          // GET /api/v1/me
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
```

- [ ] **Step 2: 验证 README 中所有 features 链接有效**

Verify by checking that each `docs/features/0x-*.md` file exists.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: restructure README with minimal quick start and features index"
```