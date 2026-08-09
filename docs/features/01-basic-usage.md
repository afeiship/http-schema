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