export default {
  baseURL: '/api',
  request: ['', 'json'],
  items: [
    // RESTful resources
    {
      resources: ['badges', 'categories'],
    },
    // Custom APIs with prefix
    {
      request: ['', 'json'],
      prefix: 'v1_',
      items: {
        me: ['get', '/me'],
        categories_root: ['get', '/categories/root', { tags: ['paginate'] }],
        badges_top: ['get', '/badges/top', { tags: ['paginate'], meta: { pageSize: 3 } }],
      },
    },
    // Typed APIs: 同一 key 自动路由到不同 path
    {
      type: 'graduate',
      request: ['/api/v1', 'json'],
      items: {
        get_user_collects: ['get', '/apply7/resume/get_user_programs'],
        hot_schools: ['get', '/recommend/hot_program_universities'],
      },
    },
    {
      type: 'undergraduate',
      request: ['/api/v1', 'json'],
      items: {
        get_user_collects: ['get', '/recommend/get_user_colleges'],
        hot_schools: ['get', '/recommend/hot_major_colleges'],
      },
    },
  ],
} as any;