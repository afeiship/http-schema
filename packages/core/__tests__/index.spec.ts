import { describe, it, expect } from 'bun:test';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';
import type { RequestConfig } from '@jswork/universal-request-core';
import httpSchema from '../src/index';
import type { HttpSchemaConfig } from '../src/types';

// 自定义适配器，用于捕获请求配置
class CaptureAdapter extends FetchAdapter {
  public lastConfig: RequestConfig | null = null;
  async request(config: RequestConfig): Promise<any> {
    this.lastConfig = config;
    return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
  }
}

describe('httpSchema', () => {
  it('should return an object with api functions', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: {
        ping: ['get', '/ping'],
      }
    };
    const api = httpSchema(config, { adapter: new FetchAdapter() });
    expect(api).toHaveProperty('ping');
    expect(typeof api.ping).toBe('function');
  });

  it('should handle complex nested schema', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [
        {
          request: ['/admin', 'json'],
          items: {
            login: ['post', '/auth'],
            profile: ['get', '/me'],
          }
        },
        {
          resources: ['tags', 'posts'],
          items: {
            tags_top: ['get', '/tags/top'],
          }
        }
      ]
    };
    const api = httpSchema(config, { adapter: new FetchAdapter() });
    expect(api).toHaveProperty('login');
    expect(api).toHaveProperty('profile');
    expect(api).toHaveProperty('tags_index');
    expect(api).toHaveProperty('tags_top');
    expect(api).toHaveProperty('posts_index');
  });

  it('should handle empty schema', () => {
    const api = httpSchema({}, { adapter: new FetchAdapter() });
    expect(api).toEqual({});
  });

  it('should work with options overrides', () => {
    const config: HttpSchemaConfig = {
      items: {
        ping: ['get', '/ping'],
      }
    };
    const api = httpSchema(config, {
      baseURL: 'http://override.com',
      dataType: 'json',
      adapter: new FetchAdapter(),
    });
    expect(api).toHaveProperty('ping');
  });

  it('should throw when adapter is missing', () => {
    expect(() => httpSchema({ items: { ping: ['get', '/ping'] } }))
      .toThrow(/adapter is required/);
  });

  it('should extract params from {param} and :param syntax', () => {
    // 间接测试：通过 splitData 验证两种语法都能正确提取参数
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: {
        test1: ['get', '/users/{id}/posts'],
        test2: ['get', '/users/:id/profile'],
      }
    };
    // 验证函数能正常创建，说明路径参数提取无报错
    const api = httpSchema(config, { adapter: new FetchAdapter() });
    expect(api).toHaveProperty('test1');
    expect(api).toHaveProperty('test2');
  });

  it('should pass leaf config fields to request config', async () => {
    const adapter = new CaptureAdapter();
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: {
        categories_root: ['get', '/categories/root', { tags: ['ni2lv'] }],
      }
    };
    const api = httpSchema(config, { adapter });
    await api.categories_root();
    expect(adapter.lastConfig?.tags).toEqual(['ni2lv']);
  });

  it('should inject id and key into request config', async () => {
    const adapter = new CaptureAdapter();
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: {
        categories_root: ['get', '/categories/root'],
        badges_top: ['get', '/badges/top'],
      }
    };
    const api = httpSchema(config, { adapter });
    await api.categories_root();
    expect(adapter.lastConfig?.id).toBe('categories_root');
    expect(adapter.lastConfig?.key).toBe('categories_root');

    await api.badges_top();
    expect(adapter.lastConfig?.id).toBe('badges_top');
    expect(adapter.lastConfig?.key).toBe('badges_top');
  });

  it('should allow callOptions to override id and key', async () => {
    const adapter = new CaptureAdapter();
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: {
        ping: ['get', '/ping'],
      }
    };
    const api = httpSchema(config, { adapter });
    await api.ping(null, { id: 'custom_id', key: 'custom_key' });
    expect(adapter.lastConfig?.id).toBe('custom_id');
    expect(adapter.lastConfig?.key).toBe('custom_key');
  });
});

describe('typed API', () => {
  it('should expose api.typed as a function', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [
        {
          type: 'graduate',
          request: ['/v1', 'json'],
          items: {
            get_user_collects: ['get', '/collects'],
          }
        }
      ]
    };
    const api = httpSchema(config, {
      adapter: new FetchAdapter(),
      resolveType: () => 'graduate',
    });
    expect(api).toHaveProperty('typed');
    expect(typeof api.typed).toBe('function');
    const fn = api.typed('get_user_collects');
    expect(typeof fn).toBe('function');
  });

  it('should route to correct path via resolveType', async () => {
    const adapter = new CaptureAdapter();
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [
        {
          type: 'graduate',
          request: ['/v1', 'json'],
          items: {
            get_user_collects: ['get', '/collects'],
          }
        },
        {
          type: 'undergraduate',
          request: ['/v1', 'json'],
          items: {
            get_user_collects: ['get', '/colleges'],
          }
        }
      ]
    };
    const api = httpSchema(config, {
      adapter,
      resolveType: () => 'graduate',
    });
    await api.typed('get_user_collects')({ userId: 1 });
    expect(adapter.lastConfig?.url).toBe('/api/v1/collects');
  });

  it('should return different routes for different types', async () => {
    const adapter = new CaptureAdapter();
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [
        {
          type: 'graduate',
          request: ['/v1', 'json'],
          items: {
            get_user_collects: ['get', '/collects'],
          }
        },
        {
          type: 'undergraduate',
          request: ['/v1', 'json'],
          items: {
            get_user_collects: ['get', '/colleges'],
          }
        }
      ]
    };
    const apiGraduate = httpSchema(config, { adapter, resolveType: () => 'graduate' });
    await apiGraduate.typed('get_user_collects')({ userId: 1 });
    expect(adapter.lastConfig?.url).toBe('/api/v1/collects');

    const apiUndergrad = httpSchema(config, { adapter, resolveType: () => 'undergraduate' });
    await apiUndergrad.typed('get_user_collects')({ userId: 1 });
    expect(adapter.lastConfig?.url).toBe('/api/v1/colleges');
  });

  it('should throw when resolveType returns undefined', async () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [{
        type: 'graduate',
        request: ['/v1', 'json'],
        items: { get_user_collects: ['get', '/collects'] }
      }]
    };
    const api = httpSchema(config, { adapter: new FetchAdapter(), resolveType: () => '' as any });
    await expect(api.typed('get_user_collects')({})).rejects.toThrow(/resolveType/);
  });

  it('should throw when resolveType returns unknown type', async () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [{
        type: 'graduate',
        request: ['/v1', 'json'],
        items: { get_user_collects: ['get', '/collects'] }
      }]
    };
    const api = httpSchema(config, { adapter: new FetchAdapter(), resolveType: () => 'unknown' });
    await expect(api.typed('get_user_collects')({})).rejects.toThrow(/unknown/);
  });

  it('should throw when resolveType is not configured', async () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [{
        type: 'graduate',
        request: ['/v1', 'json'],
        items: { get_user_collects: ['get', '/collects'] }
      }]
    };
    const api = httpSchema(config, { adapter: new FetchAdapter() } as any);
    await expect(api.typed('get_user_collects')({})).rejects.toThrow(/resolveType/);
  });

  it('should throw when type has no matching key', async () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [{
        type: 'graduate',
        request: ['/v1', 'json'],
        items: { get_user_collects: ['get', '/collects'] }
      }]
    };
    const api = httpSchema(config, { adapter: new FetchAdapter(), resolveType: () => 'graduate' });
    await expect(api.typed('nonexistent_key')({})).rejects.toThrow(/nonexistent_key/);
  });

  it('should coexist with normal API keys', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [
        { type: 'graduate', request: ['/v1', 'json'], items: { ping: ['get', '/ping'] } },
        { items: { admin_login: ['post', '/admin/login'] } },
      ]
    };
    const api = httpSchema(config, { adapter: new FetchAdapter(), resolveType: () => 'graduate' });
    expect(api).toHaveProperty('admin_login');
    expect(typeof api.admin_login).toBe('function');
    expect(typeof api.typed).toBe('function');
    expect(typeof api.typed('ping')).toBe('function');
  });
});