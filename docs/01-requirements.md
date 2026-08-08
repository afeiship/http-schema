# http-schema DSL 解析器实现提示词

## 英文描述（12词）

A parser for HTTP schema DSL, supporting RESTful APIs and path parsing\.

## 核心提示词（简洁版）

帮我实现一个 http\-schema DSL 解析器，参考项目：path\-dual\-parser、universal\-request。

### DSL 语法示例

```js
export default {
  baseURL: import.meta.env.VITE_API_URL,
  request: ['/api', 'json'],
  items: [
    {
      request: ['/rails_jwt_admin', 'json'],
      items: {
        login: ['post', '/auth'],
        profile: ['get', '/me']
      }
    },
    {
      resources: ['badges','posts'],
      items: {
        badges_top: ['get', '/badges/top?limit=100'],
        categories_root: ['get', '/categories/root', { tags: ['ni2lv'] }]
      }
    }
  ]
};
```

### DSL 规则

1. items 二态：数组=子分组节点；对象=接口叶子，key 为接口函数名；
2. request: \[prefix, format\]：分组层级前缀，向下继承；
3. resources\[\]：自动生成 RESTful 5个接口：\_index/\_show/\_create/\_update/\_destroy；
4. 接口简写：name: \[method, path, meta?\]，meta 支持 tags 等扩展；
5. path 支持\{id\}路径占位符；path 以/开头代表相对 baseURL 绝对路径，否则拼接分组前缀栈；
6. baseURL 全局继承。
7. 支持 suffix/prefix

### 第三方(都有llms.txt)
- https://github.com/afeiship/universal-request
- https://github.com/afeiship/path-dual-parser

### 需要实现能力

1. TS 类型定义整套 schema；
2. 递归 parser，输入 schema 对象，输出扁平化接口列表（name/method/fullPath/meta/baseURL）；
3. resources 展开逻辑；
4. 路径栈拼接、路径占位符解析；
5. 基于 universal\-request 生成可直接调用的 api 实例对象；
6. 输出调用示例；
7. 标注边界坑点。

输出完整可运行 TS 代码，附带注释。

> （注：部分内容可能由 AI 生成）
