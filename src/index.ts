import { createRequest } from '@jswork/universal-request-core';
import type { RequestConfig } from '@jswork/universal-request-core';
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
 * http-schema 入口
 * 输入 DSL 配置，输出可调用的扁平 api 实例
 */
function httpSchema(
  schema: HttpSchemaConfig,
  options?: HttpSchemaOptions
): ApiInstance {
  // 1. 解析 DSL → 扁平 ApiItem[]
  const items = parseSchema(schema);

  // 2. 校验 adapter 必须传入
  if (!options?.adapter) {
    throw new Error('httpSchema: adapter is required (e.g. new FetchAdapter())');
  }

  // 3. 创建 RequestCore 实例
  const baseURL = options?.baseURL ?? schema.baseURL ?? '';
  const httpClient = createRequest({
    baseURL,
    adapter: options.adapter,
    interceptors: options?.interceptors,
  });

  // 4. 构建 api 实例
  const api: ApiInstance = {};

  items.forEach((item: ApiItem) => {
    api[item.name] = (data?: any, callOptions?: Record<string, any>) => {
      // 替换路径占位符
      const [params, payload] = splitData(item.fullPath, data);
      const resolvedPath = parse(item.fullPath, params);

      // 构建请求配置
      const config: RequestConfig = {
        url: resolvedPath,
        method: item.method.toUpperCase() as any,
        baseURL: item.baseURL || undefined,
        dataType: (options?.dataType ?? item.dataType) as any,
        ...callOptions,
      };

      // GET/HEAD/DELETE 时 payload 由 adapter 作为 query string；
      // 其他方法作为请求体。adapter 的 buildURL 已处理该路由。
      if (payload !== undefined) {
        config.payload = payload;
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