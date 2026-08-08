import type { HttpSchemaLeaf, HttpSchemaLeafRecord, ResourceDef } from './types';

// REST 模板表
const REST_TEMPLATES: Record<string, [string, string]> = {
  index: ['get', '/{name}'],
  show: ['get', '/{name}/{id}'],
  create: ['post', '/{name}'],
  update: ['put', '/{name}/{id}'],
  destroy: ['delete', '/{name}/{id}'],
};

const ALL_ACTIONS = Object.keys(REST_TEMPLATES);

/**
 * 将单个资源名展开为 CRUD 接口项
 */
function expandResource(
  name: string,
  actions: string[],
  resPrefix: string,
  resSuffix: string
): HttpSchemaLeafRecord {
  const result: HttpSchemaLeafRecord = {};
  actions.forEach((action) => {
    const [method, tpl] = REST_TEMPLATES[action];
    const path = tpl.replace('{name}', name);
    const key = resPrefix + name + '_' + action + resSuffix;
    result[key] = [method, path] as HttpSchemaLeaf;
  });
  return result;
}

/**
 * 标准化 resources 定义，展开为 CRUD 接口项
 */
export function normalizeResources(
  resources: (string | ResourceDef)[],
  parentPrefix: string,
  parentSuffix: string
): HttpSchemaLeafRecord {
  const result: HttpSchemaLeafRecord = {};

  resources.forEach((res) => {
    let name: string;
    let actions: string[];
    let prefix = parentPrefix;
    let suffix = parentSuffix;

    if (typeof res === 'string') {
      name = res;
      actions = [...ALL_ACTIONS];
    } else {
      name = res.name;
      prefix = res.prefix ?? parentPrefix;

      if (res.only) {
        const unknown = res.only.filter((a) => !ALL_ACTIONS.includes(a));
        if (unknown.length) {
          throw new Error(`Unknown action(s) in only: ${unknown.join(', ')}. Valid actions: ${ALL_ACTIONS.join(', ')}`);
        }
        actions = ALL_ACTIONS.filter((a) => res.only!.includes(a));
      } else if (res.except) {
        const unknown = res.except.filter((a) => !ALL_ACTIONS.includes(a));
        if (unknown.length) {
          throw new Error(`Unknown action(s) in except: ${unknown.join(', ')}. Valid actions: ${ALL_ACTIONS.join(', ')}`);
        }
        actions = ALL_ACTIONS.filter((a) => !res.except!.includes(a));
      } else {
        actions = [...ALL_ACTIONS];
      }
    }

    Object.assign(result, expandResource(name, actions, prefix, suffix));
  });

  return result;
}