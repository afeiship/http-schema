import type { Response } from '@jswork/universal-request-core';

export const tagTransformInterceptor = () => ({
  id: 'tag-transform',
  response: (res: Response) => {
    const tags = res.config?.meta?.tags as string[] | undefined;
    if (!tags || !tags.length) return res;

    if (tags.includes('ni2lv')) {
      // ni2lv 转换：将 categories 转成 key-value 格式
      if (Array.isArray(res.data)) {
        res.data = res.data.map((item: any) => ({
          value: item.id,
          label: item.name,
        }));
      }
    }

    if (tags.includes('featured')) {
      // featured 标记：为每个 item 添加 _featured 标记
      if (Array.isArray(res.data)) {
        res.data = res.data.map((item: any) => ({
          ...item,
          _featured: true,
        }));
      }
    }

    return res;
  },
});