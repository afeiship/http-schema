import { describe, it, expect } from 'bun:test';
import { normalizeResources } from '../src/rest';

describe('normalizeResources', () => {
  it('should expand string resource to 5 CRUD actions', () => {
    const result = normalizeResources(['tags'], '', '');
    expect(Object.keys(result)).toEqual([
      'tags_index', 'tags_show', 'tags_create', 'tags_update', 'tags_destroy'
    ]);
    expect(result.tags_index).toEqual(['get', '/tags']);
    expect(result.tags_show).toEqual(['get', '/tags/{id}']);
    expect(result.tags_create).toEqual(['post', '/tags']);
    expect(result.tags_update).toEqual(['put', '/tags/{id}']);
    expect(result.tags_destroy).toEqual(['delete', '/tags/{id}']);
  });

  it('should handle resource with only filter', () => {
    const result = normalizeResources([{ name: 'users', only: ['index', 'show'] }], '', '');
    expect(Object.keys(result)).toEqual(['users_index', 'users_show']);
  });

  it('should handle resource with except filter', () => {
    const result = normalizeResources([{ name: 'users', except: ['destroy'] }], '', '');
    expect(Object.keys(result)).toEqual([
      'users_index', 'users_show', 'users_create', 'users_update'
    ]);
  });

  it('should apply prefix and suffix to function names', () => {
    const result = normalizeResources(['tags'], 'v1_', 'Api');
    // 所有 key 都应包含前后缀
    Object.keys(result).forEach(key => {
      expect(key.startsWith('v1_')).toBe(true);
      expect(key.endsWith('Api')).toBe(true);
    });
    // 验证展开后的 action 数量
    expect(Object.keys(result).length).toBe(5);
  });

  it('should handle multiple resources', () => {
    const result = normalizeResources(['tags', 'posts'], '', '');
    expect(Object.keys(result)).toContain('tags_index');
    expect(Object.keys(result)).toContain('posts_index');
  });

  it('should handle empty resources array', () => {
    const result = normalizeResources([], '', '');
    expect(result).toEqual({});
  });
});