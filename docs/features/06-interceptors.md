---
name: Interceptors
description: 请求拦截器与响应转换
---

## 用法

```js
import httpSchema from '@jswork/http-schema';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';

const api = httpSchema(schema, {
  adapter: new FetchAdapter(),
  transformResponse: (res) => res.data,
  interceptors: [
    {
      request: (config) => {
        config.headers = { ...config.headers, Authorization: 'Bearer xxx' };
        return config;
      },
      response: (res) => {
        console.log('response:', res);
        return res;
      }
    }
  ]
});
```

## 规则

- `interceptors` 支持 `request` 和 `response` 钩子
- `request` 拦截器在发送前执行，可修改请求配置
- `response` 拦截器在收到响应后执行
- `transformResponse` 全局转换响应数据，在 interceptor 之后执行

## 参考

- [Basic Usage](01-basic-usage.md)
- [Schema Config](07-schema-config.md)