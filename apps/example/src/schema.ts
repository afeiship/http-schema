export default {
  baseURL: '/api',
  request: ['', 'json'],
  items: [
    {
      resources: ['badges', 'posts', 'categories'],
    },
    {
      request: ['', 'json'],
      items: {
        me: ['get', '/me'],
        categories_root: ['get', '/categories/root', { tags: ['ni2lv'] }],
        badges_top: ['get', '/badges/top', { tags: ['featured'] }],
      },
    },
  ],
} as any;