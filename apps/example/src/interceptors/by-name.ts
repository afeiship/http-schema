/**
 * 演示如何使用 res.config.name 定位特定接口
 *
 * schema 中该分组加了 prefix: 'v1_'，所以完整的 name 是 v1_categories_root。
 * 拦截器通过 name 精确匹配，仅对 v1_categories_root 接口生效。
 */
const byNameInterceptor = () => ({
  id: 'by-name',
  response: (res: any) => {
    const name = res.config?.name;

    // [demo] 打印当前请求的接口名，方便在控制台观察
    console.log(`[by-name] current name: ${name}`);

    // 仅对 v1_categories_root 接口做特殊处理
    // （schema 中该分组加了 prefix: 'v1_'，所以完整的 name 是 v1_categories_root）
    if (name === 'v1_categories_root') {
      console.log(`[by-name] matched! injecting _fromRoot`);
      if (Array.isArray(res.data)) {
        res.data = res.data.map((item: any) => ({
          ...item,
          _fromRoot: true,
        }));
      }
    }

    return res;
  },
});

export default byNameInterceptor;