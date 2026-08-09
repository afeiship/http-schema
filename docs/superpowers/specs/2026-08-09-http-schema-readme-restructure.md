# http-schema README 重构 & features 特性文档

## 背景 / 动机

当前 `README.md` 承担了过多职责：项目介绍、完整 DSL 语法演示、Typed API 详细说明、API Options 表格、Schema Types 类型展示、DSL rules 表格全部塞在一个文件里。导致：

- README 过长，读者难以快速上手
- 每个特性（基础用法、RESTful、typed、path 参数、prefix/suffix、interceptor）没有独立文档，难以单独查阅
- DSL 规则表格中存在重复行（`type` 出现两次）

**目标**：把每个特性拆到 `docs/features/01-xx` 独立文档；README 只保留安装 + 一个典型的最小示例 + features 索引。

## 方案（已确认：方案 A 扁平结构）

```
docs/features/
├── 01-basic-usage.md        # 基本 DSL 定义 & 创建 API 实例
├── 02-restful-resources.md  # RESTful CRUD 自动生成
├── 03-typed-api.md          # 多业务线同构接口
├── 04-path-params.md        # 路径占位符 {id} / :param
├── 05-prefix-suffix.md      # 函数名前缀/后缀
├── 06-interceptors.md       # 请求拦截器 & transformResponse
├── 07-schema-config.md      # 完整配置项参考（Options 表格等）
└── 08-dsl-rules.md          # 全套 DSL 规则参考
```

每个特性文件统一结构：

```markdown
---
name: 特性中文名
description: 一句话说明
---

## 用法    # 精简示例代码
## 规则    # 核心规则说明
## 参考    # 相关链接
```

## README 改造

只保留：

- 标题 + 一句话描述
- Installation
- Quick Start（一个典型最小示例，非完整 DSL）
- Features 目录索引（链接到 docs/features/）
- License

移除（迁移到 features）：

| 原内容 | 迁移目标 |
|--------|----------|
| DSL rules 表格 | `08-dsl-rules.md` |
| API / Options 表格 | `07-schema-config.md` |
| Typed API 详细说明 | `03-typed-api.md` |
| Schema Types 类型展示 | 删除（读者看源码即可） |
| Monorepo Structure | 保留在 README |

### Quick Start 示例（约 20 行）

```js
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

// api.ts
const api = httpSchema(schema, { adapter: new FetchAdapter() });
await api.badges_index();     // GET /api/badges
await api.profile();          // GET /api/v1/me
```

## 范围

- 仅文档重构，不涉及任何核心代码改动
- 新增 `docs/features/` 8 个文件
- 重写 `README.md`

## 验证标准

- [ ] `docs/features/` 存在 8 个特性文件，命名符合 `01-xx` 规范
- [ ] README Quick Start 可直接运行
- [ ] README 中所有被移除的内容都能在 features 中找到对应
- [ ] 每个特性文件结构统一（name/description/用法/规则/参考）