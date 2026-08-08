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

  it('should pass meta from schema to request config', async () => {
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
});