import { describe, it, expect } from 'bun:test';
import type {
  HttpSchemaLeaf,
  HttpSchemaLeafRecord,
  ResourceDef,
  HttpSchemaItem,
  HttpSchemaItems,
  HttpSchemaConfig,
  ApiItem,
  HttpSchemaOptions,
  ApiFunction,
  ApiInstance,
} from '../src/types';

describe('TypeScript type exports', () => {
  it('should export all type interfaces', () => {
    // Compile-time check — the type imports above must resolve.
    const types = [
      'HttpSchemaLeaf',
      'HttpSchemaLeafRecord',
      'ResourceDef',
      'HttpSchemaItem',
      'HttpSchemaItems',
      'HttpSchemaConfig',
      'ApiItem',
      'HttpSchemaOptions',
      'ApiFunction',
      'ApiInstance',
    ];
    expect(types.length).toBe(10);
  });
});