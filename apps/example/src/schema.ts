export default {
  baseURL: '/api',
  request: ['', 'json'],
  items: [
    {
      request: ['/rails_jwt_admin', 'json'],
      items: {
        login: ['post', '/auth'],
        profile: ['get', '/me'],
      },
    },
    {
      resources: ['badges', 'posts', 'categories'],
      items: {
        badges_top: ['get', '/badges/top?limit=100'],
        categories_root: ['get', '/categories/root', { tags: ['ni2lv'] }],
      },
    },
  ],
} as any;