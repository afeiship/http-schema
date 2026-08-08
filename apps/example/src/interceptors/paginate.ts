const paginateInterceptor = () => ({
  id: 'paginate',
  response: (res: any) => {
    const tags = res.config?.tags;
    if (!tags?.includes('paginate')) return res;

    if (Array.isArray(res.data)) {
      const pageSize = res.config?.meta?.pageSize ?? 10;
      res.data = {
        items: res.data,
        total: res.data.length,
        page: 1,
        pageSize,
      };
    }

    return res;
  },
});

export default paginateInterceptor;