import { describe, it, expect } from 'bun:test';
import { parse } from '../src/parser';
import type { HttpSchemaConfig } from '../src/types';

describe('parse', () => {
  it('should parse flat leaf items', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: {
        ping: ['get', '/ping'],
        echo: ['post', '/echo', { tags: ['test'] }],
      }
    };
    const result = parse(config);
    expect(result).toHaveLength(2);

    expect(result[0].name).toBe('ping');
    expect(result[0].method).toBe('get');
    expect(result[0].fullPath).toBe('/api/ping');
    expect(result[0].dataType).toBe('json');
    expect(result[0].baseURL).toBe('http://test.com');

    expect(result[1].name).toBe('echo');
    expect(result[1].method).toBe('post');
    expect(result[1].fullPath).toBe('/api/echo');
    expect(result[1].config).toEqual({ tags: ['test'] });
  });

  it('should handle nested groups with request inheritance', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [
        {
          request: ['/v2', 'json'],
          items: {
            user: ['get', '/user'],
          }
        }
      ]
    };
    const result = parse(config);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('user');
    expect(result[0].fullPath).toBe('/api/v2/user');
  });

  it('should handle resources expansion in parser', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [
        {
          resources: ['tags'],
          items: {
            tags_top: ['get', '/tags/top'],
          }
        }
      ]
    };
    const result = parse(config);
    // tags_index/show/create/update/destroy + tags_top
    expect(result.length).toBe(6);
    expect(result.find(r => r.name === 'tags_top')).toBeDefined();
    expect(result.find(r => r.name === 'tags_index')).toBeDefined();
  });

  it('should handle prefix/suffix on function names', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [
        {
          prefix: 'admin_',
          suffix: 'V2',
          items: {
            dashboard: ['get', '/dashboard'],
          }
        }
      ]
    };
    const result = parse(config);
    expect(result[0].name).toBe('admin_dashboardV2');
  });

  it('should handle custom baseURL override in group', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://default.com',
      request: ['/api', 'json'],
      items: [
        {
          baseURL: 'http://other.com',
          items: {
            status: ['get', '/status'],
          }
        }
      ]
    };
    const result = parse(config);
    expect(result[0].baseURL).toBe('http://other.com');
  });

  it('should handle empty items gracefully', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
    };
    const result = parse(config);
    expect(result).toEqual([]);
  });

  it('should handle path always concatenated with prefix', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/base', 'json'],
      items: {
        test: ['get', '/absolute'],
      }
    };
    const result = parse(config);
    // 即使以 / 开头，也拼接前缀
    expect(result[0].fullPath).toBe('/base/absolute');
  });

  it('should handle prefix/suffix with resources without double application', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [
        {
          prefix: 'admin_',
          suffix: 'V2',
          resources: ['tags'],
          items: {
            tags_top: ['get', '/tags/top'],
          }
        }
      ]
    };
    const result = parse(config);
    // resources 生成的函数名应该只应用一次 prefix/suffix
    expect(result.find(r => r.name === 'admin_tags_indexV2')).toBeDefined();
    expect(result.find(r => r.name === 'admin_tags_topV2')).toBeDefined();
    // 不应该出现双重应用
    expect(result.find(r => r.name === 'admin_admin_tags_indexV2V2')).toBeUndefined();
    // 同时验证 resources 展开数量正确（5 + 1）
    expect(result.length).toBe(6);
  });

  it('should merge config from parent group and leaf', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [{
        config: { timeout: 3000, headers: { 'X-Auth': 'group' } },
        items: {
          foo: ['get', '/foo', { timeout: 5000, meta: { tags: ['paginate'] } }],
        }
      }]
    };
    const result = parse(config);
    expect(result).toHaveLength(1);
    expect(result[0].config).toEqual({
      timeout: 5000,
      headers: { 'X-Auth': 'group' },
      meta: { tags: ['paginate'] },
    });
  });

  it('should inherit parent config when leaf has no config', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      items: [{
        config: { timeout: 3000 },
        items: {
          bar: ['get', '/bar'],
        }
      }]
    };
    const result = parse(config);
    expect(result[0].config).toEqual({ timeout: 3000 });
  });

  it('should handle root-level config', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      config: { timeout: 1000 },
      items: {
        ping: ['get', '/ping'],
      }
    };
    const result = parse(config);
    expect(result[0].config).toEqual({ timeout: 1000 });
  });

  it('should handle three-level config inheritance (root → group → leaf)', () => {
    const config: HttpSchemaConfig = {
      baseURL: 'http://test.com',
      request: ['/api', 'json'],
      config: { timeout: 1000, headers: { 'X-Auth': 'root' } },
      items: [{
        config: { headers: { 'X-Auth': 'group' } },
        items: {
          foo: ['get', '/foo', { meta: { tags: ['test'] } }],
        }
      }]
    };
    const result = parse(config);
    expect(result[0].config).toEqual({
      timeout: 1000,
      headers: { 'X-Auth': 'group' },
      meta: { tags: ['test'] },
    });
  });
});