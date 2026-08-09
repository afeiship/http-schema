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