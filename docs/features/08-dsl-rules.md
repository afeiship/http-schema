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