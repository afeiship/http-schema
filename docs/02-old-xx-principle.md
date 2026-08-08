# @jswork/http-schema 原理分析

> 基于 next-fetch/axios 的 HTTP Schema 解析器，通过声明式配置生成 RESTful API 调用函数。

---

## 一、整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    @jswork/http-schema                      │
│  入口：解析 DSL 配置，获取 httpClient，调用 http-rest-config │
└──────────────────┬──────────────────────────────────────────┘
                   │ 委托
┌──────────────────▼──────────────────────────────────────────┐
│                 @jswork/http-rest-config                    │
│  核心：遍历 items + resources，生成扁平化 API 函数集合      │
└──────┬──────────────────────┬───────────────────────────────┘
       │                      │
       │ 资源标准化            │ 数据拆分
┌──────▼──────────┐  ┌───────▼──────────────┐
│ normalize-rest- │  │  http-data-parser    │
│ tpls            │  │  从请求数据中分离     │
│ 资源 → CRUD 动作 │  │  URL 参数 vs 请求体   │
└─────────────────┘  └──────────────────────┘
```

**依赖关系：**

```
http-schema
  └── http-rest-config     ← 核心逻辑
        ├── http-data-parser    ← 路径参数 & 请求数据分离
        ├── normalize-rest-tpls ← 资源定义 → CRUD 动作展开
        ├── @jswork/next-tmpl   ← 模板字符串替换 ({id} → 实际值)
        └── @jswork/next        ← 工具函数(nx.each/nx.mix等)
```

---

## 二、核心流程

### 2.1 入口：http-schema

```typescript
// 简化逻辑
const httpSchema = (inConfig, inOptions) => {
  // 1. 获取 HTTP 客户端实例（Axios/Fetch）
  const httpClient = nx[adapter].getInstance(options);

  // 2. 委托 http-rest-config 解析配置
  const context = httpRestConfig(httpClient, inConfig, { templates, transformApi });

  // 3. 可选：挂载到全局
  if (harmony) {
    nx.$api = context;   // API 集合
    nx.$http = httpClient; // HTTP 客户端
  }

  return context;
};
```

**关键职责：**
- 适配器选择（Axios / Fetch），通过 `nx[adapter].getInstance()` 获取实例
- 全局挂载（harmony 模式）
- 动态 API 支持（`nx.$dapi` / `nx.$dapiFn`）

### 2.2 核心：http-rest-config

这是整个系统的核心，负责将 DSL 配置解析为扁平的 API 函数对象。

```typescript
const httpRestConfig = (httpClient, inConfig, inOptions) => {
  const apiConfig = {};

  // 1. 资源标准化：将 resources 定义展开为 CRUD 接口项
  const resourceItems = normalizeResource(resources, templates);

  // 2. 合并 items 和 resourceItems
  const target = items.concat(resourceItems);

  // 3. 遍历每个分组，生成 API 函数
  target.forEach(function (item) {
    const request = item.request || inConfig.request;  // [prefix, format]
    const prefix = item.prefix || '';
    const suffix = item.suffix || '';
    const baseURL = item.baseURL || inConfig.baseURL;

    // 子资源展开
    const resItems = normalizeResource(resources, templates);
    const mergedItems = Object.assign({}, resItems.items, item.items);

    // 遍历每个接口定义
    nx.each(mergedItems, function (key, _item) {
      const [method, _path, _opts] = _item;
      const name = prefix + key + suffix;

      apiConfig[name] = function (inData, inOptions) {
        // 核心：构建 URL 并调用 HTTP 客户端
        const [params, data] = dp(_path, inData);  // 分离路径参数和请求体
        const apiPath = nx.tmpl(_path, params);     // 替换 {id} 占位符
        const url = baseURL + subpath + apiPath;    // 拼接完整 URL
        return httpClient[method](url, data, options);
      };
    });
  });

  return apiConfig;
};
```

**分组遍历逻辑：** items 是数组，每个元素是一个分组，分组内可以：
- 有自己的 `request`（覆盖上级的 prefix/format）
- 有自己的 `baseURL`（切换域名）
- 有自己的 `prefix/suffix`（给函数名加前后缀）
- 有自己的 `resources`（子资源）

### 2.3 数据拆分：http-data-parser

负责将路径模板中的 `{param}` 和请求数据分离：

```typescript
// 输入：路径模板 + 请求数据
// '/system/banner/{id}'  +  { id: 123, title: 'hello' }
// 输出：[ { id: 123 }, { title: 'hello' } ]
//       ↑ 路径参数      ↑ 请求体数据

const TMPL_RE = /\{([^}]+)\}/g;

export default (inUrlTmpl, inData) => {
  const keys = tmplKeys(inUrlTmpl);  // 提取 {id} → ['id']
  return slice2data(keys, inData);   // 按 keys 拆分数据
};
```

**规则：**
- 匹配路径模板中的 `{key}` 模式
- 输入数据中匹配的 key 作为 URL 路径参数
- 未匹配的 key 作为请求体数据
- 数组直接作为请求体
- `FormData` 直接透传

### 2.4 资源标准化：normalize-rest-tpls

将 `resources` 定义展开为标准的 CRUD 接口：

```typescript
// 输入
resources: ['tags', { name: 'users', only: ['index'] }]

// 输出（rails 模板）
{
  tags_index:   ['get',    '/tags'],
  tags_show:    ['get',    '/tags/{id}'],
  tags_create:  ['post',   '/tags'],
  tags_update:  ['put',    '/tags/{id}'],
  tags_destroy: ['delete', '/tags/{id}'],
  users_index:  ['get',    '/users'],
}
```

**内置模板：**

| 动作 | Rails | Postify |
|------|-------|---------|
| index | GET @ | POST @/page |
| show | GET @/{id} | POST @/editInit |
| create | POST @ | POST @/add |
| update | PUT @/{id} | POST @/edit |
| destroy | DELETE @/{id} | POST @/delete |
| 自定义动作 | POST @/{id}/{action} | - |

**资源定义格式：**
- 纯字符串：`'tags'` → 自动推导名称，生成全部5个动作
- 对象：`{ name: 'users', prefix: 'v1_', only: ['index'], except: ['destroy'] }`
- 路径形式：`'/admin/users'` → subpath=`/admin`，resourceName=`users`

---

## 三、URL 构建规则

```
最终 URL = baseURL + subpath + apiPath
         = baseURL + request[0] + 替换占位符后的路径
```

**示例：**
```typescript
config = {
  baseURL: 'http://dev.demo.com',
  request: ['/api/vi', 'json'],
  items: [{ items: { banner_delete: ['delete', '/system/banner/{id}'] } }]
}

// 调用：$api.banner_delete({ id: 123 })
// 结果：http://dev.demo.com/api/vi/system/banner/123
```

**路径占位符替换：** 使用 `nx.tmpl` 将 `{id}` 替换为实际值。

---

## 四、函数名生成规则

```
函数名 = prefix + key + suffix
```

- `prefix`：来自 item 配置或全局配置
- `key`：接口定义中的 key（如 `banner_delete`）
- `suffix`：来自 item 配置或全局配置

**资源展开时的函数名：**
```
prefix + nameSnakeCase + '_' + action + suffix
```

示例：`prefix: 'v1_', name: 'users'` → `v1_users_index`, `v1_users_show`, ...

---

## 五、transformApi 扩展点

每个 API 函数调用时，会构造一个 `transformArgs` 对象，如果传入 `transformApi` 回调，可以拦截并转换请求：

```typescript
const transformArgs = {
  key,           // 接口 key
  name,          // 最终函数名
  prefix, suffix,
  method,        // http method
  params,        // 路径参数
  url,           // 完整 URL
  data,          // 请求体
  options,       // 请求选项
  httpClient,    // HTTP 客户端
  context,       // 原始 Promise
};

return transformApi ? transformApi(transformArgs) : context;
```

**用途：** 统一加 token、错误处理、请求日志、请求格式转换等。

---

## 六、数据流总结

```
用户 DSL 配置
    │
    ▼
http-schema 入口
    │ 获取 httpClient (nx[adapter].getInstance)
    │ 调用 httpRestConfig
    ▼
http-rest-config
    │ 1. 标准化 resources → CRUD 接口项
    │ 2. 合并 items + resourceItems
    │ 3. 遍历每个分组，生成 API 函数
    ▼
apiConfig (扁平化函数对象)
    │
    ▼ 用户调用 $api.get({ id: 1 })
    │
    ├─ http-data-parser: 分离路径参数和请求体
    ├─ nx.tmpl: 替换 URL 占位符
    ├─ 拼接完整 URL
    ├─ 可选: transformApi 拦截
    └─ httpClient.get(url, data, options)
```

---

## 七、边界情况

1. **路径以 `/` 开头**：相对 baseURL 的绝对路径，直接拼接在 baseURL 后
2. **占位符找不到匹配**：`slice2data` 返回 `[null, null]`，`nx.tmpl` 不会替换，`{id}` 保持原样
3. **resources 的 only/include/exclude**：大小写敏感，必须与模板定义一致
4. **分组嵌套**：items 支持二级嵌套（分组下的 items），但当前实现最多两层
5. **动态 API**：`dynamicApi` 回调允许在运行时动态生成 API 调用