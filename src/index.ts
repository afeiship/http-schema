import { createRequest, RequestCore } from '@jswork/universal-request-core';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';
import { parse } from '@jswork/path-dual-parser';
import type { ApiItem, ApiInstance, HttpSchemaConfig, HttpSchemaOptions } from './types';
import { parse as parseSchema } from './parser';

/**
 * 从路径中提取模板参数名
 */
function extractParams(path: string): string[] {
  const params: string[] = [];
  const re = /\{(\w+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(path)) !== null) {
    params.push(match[1]);
  }
  return params;
}

/**
 * 将 data 拆分为路径参数和请求体
 */
function splitData(path: string, data: any): [Record<string, any>, any] {
  if (data == null) return [{}, undefined];
  if (typeof data !== 'object' || Array.isArray(data) || data instanceof FormData) {
    return [{}, data];
  }

  const params: Record<string, any> = {};
  const body: Record<string, any> = { ...data };
  const paramKeys = extractParams(path);

  paramKeys.forEach((key) => {
    if (key in body) {
      params[key] = body[key];
      delete body[key];
    }
  });

  const hasBody = Object.keys(body).length > 0;
  return [params, hasBody ? body : undefined];
}

/**
 * 判断一个方法是否使用 query string（GET/HEAD/DELETE）
 */
function isQueryMethod(method: string): boolean {
  return ['get', 'head', 'delete'].includes(method.toLowerCase());
}

/**
 * http-schema 入口
 * 输入 DSL 配置，输出可调用的扁平 api 实例
 */
function httpSchema(
  schema: HttpSchemaConfig,
  options?: HttpSchemaOptions
): ApiInstance {
  // 1. 解析 DSL → 扁平 ApiItem[]
  const items = parseSchema(schema);

  // 2. 创建 RequestCore 实例
  const baseURL = options?.baseURL ?? schema.baseURL ?? '';
  const httpClient = createRequest({
    baseURL,
    adapter: new FetchAdapter(),
    interceptors: options?.interceptors,
  });

  // 3. 构建 api 实例
  const api: ApiInstance = {};

  items.forEach((item: ApiItem) => {
    api[item.name] = (data?: any, callOptions?: Record<string, any>) => {
      // 替换路径占位符
      const [params, payload] = splitData(item.fullPath, data);
      const resolvedPath = parse(item.fullPath, params);

      // 构建请求配置
      const config: Record<string, any> = {
        url: resolvedPath,
        method: item.method.toUpperCase(),
        dataType: options?.dataType ?? item.dataType,
        ...callOptions,
      };

      // GET/HEAD/DELETE 的 payload 放到 query string
      // 其他方法放到请求体
      if (payload !== undefined) {
        if (isQueryMethod(item.method)) {
          config.params = payload;
        } else {
          config.payload = payload;
        }
      }

      // 发起请求
      return httpClient.request(config).then((res) => {
        if (options?.transformResponse) {
          return options.transformResponse(res);
        }
        return res;
      });
    };
  });

  return api;
}

export default httpSchema;