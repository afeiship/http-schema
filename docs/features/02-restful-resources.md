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