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
      },
    },
  ],
} as any;