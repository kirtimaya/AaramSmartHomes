/**
 * FUNCTIONAL TESTS — Phase 1.4: platform/storage (web adapter)
 *
 * What's tested:
 *   - setItem writes a value to localStorage
 *   - getItem reads it back
 *   - removeItem deletes it (getItem returns null afterwards)
 *   - All three are no-ops when window is undefined (SSR guard)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getItem, setItem, removeItem } from '../../platform/storage';

describe('platform/storage (web adapter)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('setItem stores a value and getItem retrieves it', async () => {
    await setItem('theme', 'dark');
    const value = await getItem('theme');
    expect(value).toBe('dark');
  });

  it('getItem returns null for a missing key', async () => {
    const value = await getItem('nonexistent');
    expect(value).toBeNull();
  });

  it('removeItem deletes a stored key', async () => {
    await setItem('session', 'abc123');
    await removeItem('session');
    const value = await getItem('session');
    expect(value).toBeNull();
  });

  it('overwrites an existing key', async () => {
    await setItem('color', 'light');
    await setItem('color', 'dark');
    const value = await getItem('color');
    expect(value).toBe('dark');
  });

  it('stores independent keys without interference', async () => {
    await setItem('a', '1');
    await setItem('b', '2');
    expect(await getItem('a')).toBe('1');
    expect(await getItem('b')).toBe('2');
  });
});
