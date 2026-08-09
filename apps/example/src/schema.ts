export default {
  baseURL: '/api',
  request: ['', 'json'],
  items: [
    {
      resources: ['badges', 'categories'],
    },
    {
      request: ['', 'json'],
      prefix: 'v1_',
      items: {
        me: ['get', '/me'],
        categories_root: ['get', '/categories/root', { tags: ['paginate'] }],
        badges_top: ['get', '/badges/top', { tags: ['paginate'], meta: { pageSize: 3 } }],
      },
    },
  ],
} as any;