# http-schema: ApiItem 重构 — name 改 id，新增 key

日期：2026-08-09

## 背景与目标

目前 `ApiItem.name` 存储的是经过 prefix/suffix 处理后的完整接口名（如 `v1_categories_root`），同时这个值也被注入到 `RequestConfig.name` 中供拦截器使用。

但拦截器有时需要区分"原始 schema key"和"带前缀的全名"。例如 `by-name` 拦截器需要匹配 `v1_categories_root`，而其他场景可能需要知道原始 key 是 `categories_root`。

**目标**：
- `ApiItem.name` 更名为 `id`，语义更清晰——它是接口的唯一标识
- `ApiItem` 新增 `key` 字段，值为 schema 中原始 key（未加 prefix/suffix）
- `RequestConfig` 中同时注入 `name`（从 `item.id` 取）和 `key`（从 `item.key` 取）

## 字段映射

| 字段 | 含义 | 示例值 |
|------|------|--------|
| `ApiItem.id` | 带 prefix/suffix 的全名（原名 `name`） | `v1_categories_root` |
| `ApiItem.key` | 新增：schema 里写的原始 key | `categories_root` |
| `RequestConfig.name` | 不变，值改为从 `item.id` 取 | `v1_categories_root` |
| `RequestConfig.key` | 新增：原始 key | `categories_root` |

## 改动范围

### 1. `packages/core/src/types.ts` — ApiItem 接口

```diff
 export interface ApiItem {
-  name: string;
+  id: string;
+  key: string;
   method: string;
   fullPath: string;
   dataType: DataType;
```

### 2. `packages/core/src/parser.ts` — 解析时记录原始 key

叶子节点处理处，`key` 重命名为 `rawKey`，`name` 改为 `id`，新增 `key: rawKey`：

```diff
-Object.entries(items).forEach(([key, leaf]) => {
+Object.entries(items).forEach(([rawKey, leaf]) => {
   const [method, path, leafConfig] = leaf as HttpSchemaLeaf;
-  const name = ctx.namePrefix + key + ctx.nameSuffix;
+  const id = ctx.namePrefix + rawKey + ctx.nameSuffix;
   // ...
   result.push({
-    name,
+    id,
+    key: rawKey,
     method: method.toLowerCase(),
     fullPath,
     dataType: ctx.dataType,
```

### 3. `packages/core/src/index.ts` — RequestConfig 注入

```diff
 const config: RequestConfig = {
   url: resolvedPath,
   method: item.method.toUpperCase() as any,
   baseURL: item.baseURL || undefined,
   dataType: (options?.dataType ?? item.dataType) as any,
-  name: item.name,
+  name: item.id,
+  key: item.key,
   ...item.config,
   ...callOptions,
 };
```

### 4. 测试文件

**`parser.spec.ts`**：全部 `result[0].name` → `result[0].id`，新增 `key` 断言
**`index.spec.ts`**：`lastConfig?.name` 断言不变，新增 `key` 断言（验证注入、验证 callOptions 覆盖）
**`types.spec.ts`**：无需改动
**`rest.spec.ts`**：无需改动

### 5. 其他文件 — 无需改动

- `rest.ts`：`ResourceDef.name` 是资源名，语义不同，不涉及
- `schema.ts`：DSL 定义层，不涉及
- `by-name.ts`：`res.config.name` 读取方式不变，不涉及

## 兼容性

- `RequestConfig.name` 字段名不变，已有拦截器无需修改
- `RequestConfig.key` 为新增字段，新拦截器可直接使用
- 公开 API 函数签名不变，用户无感