import { describe, it, expect } from 'bun:test';
import httpSchema from '../src/index';
import type { HttpSchemaConfig } from '../src/types';

describe('httpSchema', () => {
  it('should return an object with api functions', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: {
        ping: ['get', '/ping'],
      }
    };
    const api = httpSchema(config);
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
    const api = httpSchema(config);
    expect(api).toHaveProperty('login');
    expect(api).toHaveProperty('profile');
    expect(api).toHaveProperty('tags_index');
    expect(api).toHaveProperty('tags_top');
    expect(api).toHaveProperty('posts_index');
  });

  it('should handle empty schema', () => {
    const api = httpSchema({});
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
    });
    expect(api).toHaveProperty('ping');
  });

  it('should support Axios adapter option', () => {
    const config: HttpSchemaConfig = {
      items: {
        ping: ['get', '/ping'],
      }
    };
    const api = httpSchema(config, {
      adapter: 'Axios',
    });
    expect(api).toHaveProperty('ping');
    expect(typeof api.ping).toBe('function');
  });
});