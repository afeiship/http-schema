import httpSchema from '@jswork/http-schema';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';
import schema from './schema';
import paginateInterceptor from './interceptors/paginate';

const api = httpSchema(schema, {
  adapter: new FetchAdapter(),
  transformResponse: (res) => res.data,
  interceptors: [paginateInterceptor],
});

// debug
// @ts-ignore
window.api = api;

export default api;