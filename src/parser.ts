import type {
  HttpSchemaConfig,
  HttpSchemaItem,
  HttpSchemaItems,
  HttpSchemaLeaf,
  HttpSchemaLeafRecord,
  ApiItem,
} from './types';
import { normalizeResources } from './rest';

// 内部解析上下文
interface ParseContext {
  baseURL: string;
  prefix: string;       // 路径前缀栈（request[0] 拼接）
  dataType: string;
  namePrefix: string;   // 函数名前缀
  nameSuffix: string;   // 函数名后缀
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
        namePrefix: item.prefix ?? ctx.namePrefix,
        nameSuffix: item.suffix ?? ctx.nameSuffix,
      };

      // 展开 resources
      let mergedItems = item.items ?? {};
      if (item.resources && item.resources.length > 0) {
        const resourceItems = normalizeResources(item.resources, subCtx.namePrefix, subCtx.nameSuffix);
        mergedItems = { ...resourceItems, ...mergedItems };
      }

      result.push(...parseItems(mergedItems, subCtx));
    });
  } else {
    // 对象：叶子节点
    Object.entries(items).forEach(([key, leaf]) => {
      const [method, path, meta] = leaf as HttpSchemaLeaf;
      const name = ctx.namePrefix + key + ctx.nameSuffix;
      const fullPath = joinPaths(ctx.prefix, path);
      result.push({
        name,
        method: method.toLowerCase(),
        fullPath,
        dataType: ctx.dataType,
        baseURL: ctx.baseURL,
        meta,
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
  };

  return parseItems(config.items, ctx);
}