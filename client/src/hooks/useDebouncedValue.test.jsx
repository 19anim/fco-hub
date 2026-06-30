import { describe, expect, it } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  it('exports a reusable debounce hook', () => {
    expect(typeof useDebouncedValue).toBe('function');
  });
});
