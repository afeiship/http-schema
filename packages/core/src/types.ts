import type { DataType, InterceptorLike, Adapter, RequestConfig } from '@jswork/universal-request-core';
export type { DataType, InterceptorLike, Adapter, RequestConfig };

// DSL 叶子接口：name: [method, path, config?]
export type HttpSchemaLeaf = [
  method: string,
  path: string,
  config?: Partial<RequestConfig>
];

// 叶子记录的键值对
export interface HttpSchemaLeafRecord {
  [key: string]: HttpSchemaLeaf;
}

// 资源定义
export interface ResourceDef {
  name: string;
  prefix?: string;
  only?: string[];
  except?: string[];
}

// DSL 项目节点（分组或叶子）
export interface HttpSchemaItem {
  request?: [string, DataType];
  baseURL?: string;
  prefix?: string;
  suffix?: string;
  config?: Partial<RequestConfig>;
  resources?: (string | ResourceDef)[];
  items?: HttpSchemaItems;
}

// 二态 items：数组=子分组节点；对象=接口叶子
export type HttpSchemaItems = HttpSchemaItem[] | HttpSchemaLeafRecord;

// DSL 顶层配置
export interface HttpSchemaConfig {
  baseURL?: string;
  request?: [string, DataType];
  config?: Partial<RequestConfig>;
  items?: HttpSchemaItems;
}

// 解析后的扁平接口项
export interface ApiItem {
  id: string;
  key: string;
  type?: string;
  method: string;
  fullPath: string;
  dataType: DataType;
  baseURL: string;
  config?: Partial<RequestConfig>;
}

// http-schema 选项
export interface HttpSchemaOptions {
  baseURL?: string;
  dataType?: DataType;
  adapter?: Adapter;
  interceptors?: InterceptorLike[];
  transformResponse?: (res: any) => any;
  resolveType?: (data?: any, options?: Record<string, any>) => string;
}

// 生成的 api 函数签名
export interface ApiFunction {
  (data?: any, options?: Record<string, any>): Promise<any>;
}

// 完整 api 实例类型
export interface ApiInstance {
  [key: string]: ApiFunction;
}