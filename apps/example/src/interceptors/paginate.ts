const paginateInterceptor = () => ({
  id: 'paginate',
  response: (res: any) => {
    const meta = res.config?.meta;
    if (!meta?.tags?.includes('paginate')) return res;

    if (Array.isArray(res.data)) {
      const pageSize = meta.pageSize ?? 10;
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