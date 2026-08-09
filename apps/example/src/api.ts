import httpSchema from '@jswork/http-schema';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';
import schema from './schema';
import paginateInterceptor from './interceptors/paginate';
import byNameInterceptor from './interceptors/by-name';

// 当前业务类型（graduate | undergraduate），可在运行时切换
let currentType: 'graduate' | 'undergraduate' = 'graduate';

export function setType(type: 'graduate' | 'undergraduate') {
  currentType = type;
}

const api = httpSchema(schema, {
  adapter: new FetchAdapter(),
  transformResponse: (res) => res.data,
  interceptors: [paginateInterceptor, byNameInterceptor],
  resolveType: () => currentType,
});

// debug
// @ts-ignore
window.api = api;

export default api;