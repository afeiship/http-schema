export default {
  baseURL: '/api',
  request: ['', 'json'],
  items: [
    {
      resources: ['badges', 'posts', 'categories', 'tags'],
    },
    {
      request: ['', 'json'],
      items: {
        me: ['get', '/me'],
        categories_root: ['get', '/categories/root', { meta: { tags: ['paginate'] } }],
        badges_top: ['get', '/badges/top', { meta: { tags: ['paginate'], pageSize: 3 } }],
      },
    },
  ],
} as any;