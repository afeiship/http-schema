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