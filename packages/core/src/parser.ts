import type {
  HttpSchemaConfig,
  HttpSchemaItem,
  HttpSchemaItems,
  HttpSchemaLeaf,
  HttpSchemaLeafRecord,
  ApiItem,
  DataType,
  RequestConfig,
} from './types';
import { normalizeResources } from './rest';

// 内部解析上下文
interface ParseContext {
  baseURL: string;
  prefix: string;       // 路径前缀栈（request[0] 拼接）
  dataType: DataType;
  namePrefix: string;   // 函数名前缀
  nameSuffix: string;   // 函数名后缀
  type?: string;        // 业务类型标识，继承自分组
  config: Partial<RequestConfig>;
}

/**
 * 合并两个路径，处理 / 拼接
 */
function joinPaths(left: string, right: string): string {
  if (!left) return right;
  if (!right) return left;
  return left.replace(/\/$/, '') + '/' + right.replace(/^\//, '');
}

/**
 * 判断 items 是数组还是对象
 */
function isArrayItems(items: HttpSchemaItems): items is HttpSchemaItem[] {
  return Array.isArray(items);
}

/**
 * 递归解析 items 数组
 */
function parseItems(
  items: HttpSchemaItems,
  ctx: ParseContext
): ApiItem[] {
  const result: ApiItem[] = [];

  if (isArrayItems(items)) {
    // 数组：每个元素是子分组
    items.forEach((item) => {
      const subCtx: ParseContext = {
        baseURL: item.baseURL ?? ctx.baseURL,
        prefix: item.request ? joinPaths(ctx.prefix, item.request[0]) : ctx.prefix,
        dataType: item.request?.[1] ?? ctx.dataType,
        namePrefix: item.type ? '' : (item.prefix ?? ctx.namePrefix),
        nameSuffix: item.type ? '' : (item.suffix ?? ctx.nameSuffix),
        type: item.type ?? ctx.type,
        config: item.config ? { ...ctx.config, ...item.config } : ctx.config,
      };

      // 展开 resources（不传 namePrefix/nameSuffix，叶子分支统一处理）
      let mergedItems = item.items ?? {};
      if (item.resources && item.resources.length > 0) {
        const resourceItems = normalizeResources(item.resources, '', '');
        mergedItems = { ...resourceItems, ...mergedItems };
      }

      result.push(...parseItems(mergedItems, subCtx));
    });
  } else {
    // 对象：叶子节点
    Object.entries(items).forEach(([rawKey, leaf]) => {
      const [method, path, leafConfig] = leaf as HttpSchemaLeaf;
      const id = ctx.namePrefix + rawKey + ctx.nameSuffix;
      const fullPath = joinPaths(ctx.prefix, path);
      const mergedConfig = leafConfig
        ? { ...ctx.config, ...leafConfig }
        : ctx.config;
      result.push({
        id,
        key: rawKey,
        type: ctx.type,
        method: method.toLowerCase(),
        fullPath,
        dataType: ctx.dataType,
        baseURL: ctx.baseURL,
        config: mergedConfig,
      });
    });
  }

  return result;
}

/**
 * 解析 DSL 配置，输出扁平化 ApiItem 列表
 */
export function parse(config: HttpSchemaConfig): ApiItem[] {
  if (!config.items) return [];

  const ctx: ParseContext = {
    baseURL: config.baseURL ?? '',
    prefix: config.request?.[0] ?? '',
    dataType: config.request?.[1] ?? 'json',
    namePrefix: '',
    nameSuffix: '',
    config: config.config ?? {},
  };

  return parseItems(config.items, ctx);
}