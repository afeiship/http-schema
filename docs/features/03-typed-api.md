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