import httpSchema from '@jswork/http-schema';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';
import schema from './schema';
import { tagTransformInterceptor } from './interceptors/tag-transform';

const api = httpSchema(schema, {
  adapter: new FetchAdapter(),
  transformResponse: (res) => res.data,
  interceptors: [tagTransformInterceptor],
});

// debug
// @ts-ignore
window.api = api;

export default api;