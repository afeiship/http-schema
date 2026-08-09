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