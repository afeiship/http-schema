# http-schema 解析器设计文档

> 日期：2026-08-08
> 状态：已批准

## 一、目标

实现 `@jswork/http-schema` 的 DSL 解析器：输入声明式 HTTP schema 配置，输出可直接调用的 api 实例对象。底层基于 `universal-request` 的 `RequestCore`，路径占位符替换基于 `path-dual-parser`。

## 二、已确认决策

| 决策点 | 结论 |
|--------|------|
| 与 universal-request 关系 | 直接依赖，用 `RequestCore` 作为底层 HTTP 客户端 |
| 输出形态 | 扁平 api 函数对象（key=函数名，value=可调用函数） |
| 调用签名 | `api.key(data, options)`，data 自动分离路径参数与请求体 |
| harmony 全局挂载 | 不保留，纯函数返回 |
| path 以 / 开头 | 始终拼接分组前缀（旧代码行为，不跳过） |
| request[1] format | 映射到 `RequestConfig.dataType` |
| 测试框架 | bun test，目录 `__tests__` |

## 三、架构与模块结构

```
src/
  types.ts    — DSL 配置类型 + 解析结果类型 + 选项类型
  rest.ts     — resources[] → CRUD 接口项展开
  parser.ts   — 递归遍历 items，扁平化输出接口描述列表
  index.ts    — 入口：接收 DSL + 选项，生成可调用 api 实例
```

**数据流：**

```
DSL 配置 (schema.ts)
    │
    ▼
httpSchema(schema, options)
    │
    ├─ parser.parse()  → 递归遍历 items + rest 展开
    │    输出: ApiItem[] (name/method/fullPath/meta/baseURL)
    │
    └─ 遍历 ApiItem[]，用 RequestCore 包装成可调用函数
         输出: { [name]: (data?, options?) => Promise<Response> }
```

**关键约束：**
- 无全局副作用（不挂 `nx.$api`）
- `format` 映射到 `RequestConfig.dataType`
- 调用签名 `data/options`，内部用 `path-dual-parser` 的 `parse` 替换占位符

## 四、类型定义（types.ts）

```typescript
// DSL 配置类型
interface HttpSchemaItem {
  request?: [string, DataType];     // [prefix, format]
  baseURL?: string;
  prefix?: string;
  suffix?: string;
  resources?: (string | ResourceDef)[];
  items?: HttpSchemaItems;          // 数组或对象
}

// 二态 items
type HttpSchemaItems = HttpSchemaItem[] | Record<string, HttpSchemaLeaf>;

// 叶子接口：name: [method, path, meta?]
type HttpSchemaLeaf = [
  method: string,
  path: string,
  meta?: Record<string, any>
];

// 资源定义
interface ResourceDef {
  name: string;
  prefix?: string;
  only?: string[];
  except?: string[];
}

// 解析后的扁平接口项
interface ApiItem {
  name: string;
  method: string;
  fullPath: string;
  dataType: string;
  baseURL: string;
  meta?: Record<string, any>;
}

// 选项
interface HttpSchemaOptions {
  baseURL?: string;
  dataType?: DataType;
  request?: [string, DataType];
}
```

**要点：**
- `DataType` 复用 `universal-request` 类型（`'json' | 'urlencoded' | 'multipart' | 'text' | 'blob' | 'auto'`）
- `resources` 支持字符串和对象两种定义
- `HttpSchemaItems` 二态用联合类型表达

## 五、resources 展开（rest.ts）

`resources` 数组展开为 Rails 风格 CRUD 5 个接口：

| 动作 | 方法 | 路径 |
|------|------|------|
| `_index` | GET | `/{name}` |
| `_show` | GET | `/{name}/{id}` |
| `_create` | POST | `/{name}` |
| `_update` | PUT | `/{name}/{id}` |
| `_destroy` | DELETE | `/{name}/{id}` |

```typescript
function normalizeResources(
  resources: (string | ResourceDef)[],
  parentPrefix: string,
  parentSuffix: string
): HttpSchemaLeafRecord
```

**规则：**
- 纯字符串 `'tags'` → 生成全部 5 个动作
- 对象 `{ name: 'users', only: ['index', 'show'] }` → `only` 过滤
- 函数名：`prefix + name + '_' + action + suffix`
- 路径占位符 `{id}` 保留，运行时替换

## 六、递归解析器（parser.ts）

递归遍历 `items` 树，输出扁平化 `ApiItem[]`。

```typescript
function parse(config: HttpSchemaItem, parentCtx?: ParseContext): ApiItem[]
```

**ParseContext 继承链：** `baseURL`(全局) + `request` prefix(各层叠加) + `prefix`/`suffix`

**递归规则：**
1. `items` 是数组 → 每个元素是子分组，递归处理，`request`/`baseURL` 覆盖继承
2. `items` 是对象 → 叶子节点，生成最终 `ApiItem`
3. 每个分组先展开 `resources` → 合并到 `items` 后再遍历
4. 路径拼接：`parentPrefix + currentPath`（始终拼接，不以 / 跳过）
5. 函数名：`prefix + key + suffix`

## 七、入口装配（index.ts）

```typescript
function httpSchema(
  schema: HttpSchemaConfig,
  options?: {
    baseURL?: string;
    dataType?: DataType;
    adapter?: 'Fetch' | 'Axios';
    interceptors?: InterceptorLike[];
    transformResponse?: (res: Response) => any;
  }
): Record<string, ApiFunction>
```

**内部流程：**
1. `parser.parse(schema)` → `ApiItem[]`
2. 创建 `RequestCore` 实例（基于 universal-request）
3. 遍历 `ApiItem[]`，每个生成 `(data, options) =>` 调用函数

**调用函数内部：**
```
api.key(data, options)
  ├─ path-dual-parser 的 parse() 替换 {id} 占位符
  ├─ 拼接完整 URL: baseURL + prefix + resolvedPath
  ├─ 自动分离路径参数 vs 请求体（旧版 data-options 兼容）
  └─ 委托 RequestCore 的对应 method
```

**调用示例：**
```typescript
import httpSchema from '@jswork/http-schema';
import schema from './schema';

const api = httpSchema(schema, {
  baseURL: import.meta.env.VITE_API_URL,
  adapter: 'Fetch',
  interceptors: [authInterceptor],
  transformResponse: (res) => res.data
});

await api.login({ username: 'admin', password: 'xxx' });
await api.badges_index({ limit: 100 });
await api.badges_show({ id: 123 });
```

## 八、边界情况

1. **路径以 `/` 开头**：仍拼接分组前缀（旧代码行为）
2. **占位符无匹配**：`path-dual-parser` 的 `parse()` 保持 `{id}` 原样，不报错
3. **resources 的 only/except**：大小写敏感，与动作名一致（`index`/`show`/`create`/`update`/`destroy`）
4. **分组嵌套**：`items` 支持任意层级递归（不再限制两层）
5. **format 映射**：`request[1]` 作为该分组及子分组的默认 `dataType`

## 九、测试策略

`__tests__/` 下按模块拆分：
- `rest.spec.ts` — resources 展开（字符串/对象/only/except/函数名）
- `parser.spec.ts` — 递归遍历、路径拼接、继承、meta
- `index.spec.ts` — 端到端：输入 schema → 可调用 api，验证 URL 与参数分离