/**
 * FUNCTIONAL TESTS — Phase 1.4: useSystemColorScheme hook (web adapter)
 *
 * What's tested:
 *   - Returns 'light' when matchMedia reports light
 *   - Returns 'dark' when matchMedia reports dark
 *   - Updates when the media query fires a change event
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSystemColorScheme } from '../../platform/useSystemColorScheme';

type MatchMediaListener = (e: MediaQueryListEvent) => void;

function mockMatchMedia(prefersDark: boolean) {
  const listeners: MatchMediaListener[] = [];
  const mql = {
    matches: prefersDark,
    addEventListener: vi.fn((_: string, cb: MatchMediaListener) => listeners.push(cb)),
    removeEventListener: vi.fn(),
    dispatchChange: (matches: boolean) => {
      listeners.forEach(cb => cb({ matches } as MediaQueryListEvent));
    },
  };
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue(mql),
  });
  return mql;
}

describe('useSystemColorScheme', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns light when matchMedia reports light', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useSystemColorScheme());
    expect(result.current).toBe('light');
  });

  it('returns dark when matchMedia reports dark', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useSystemColorScheme());
    expect(result.current).toBe('dark');
  });

  it('updates to dark when the media query fires a change event', () => {
    const mql = mockMatchMedia(false);
    const { result } = renderHook(() => useSystemColorScheme());
    expect(result.current).toBe('light');

    act(() => { mql.dispatchChange(true); });
    expect(result.current).toBe('dark');
  });

  it('updates to light when the media query fires back to light', () => {
    const mql = mockMatchMedia(true);
    const { result } = renderHook(() => useSystemColorScheme());
    expect(result.current).toBe('dark');

    act(() => { mql.dispatchChange(false); });
    expect(result.current).toBe('light');
  });

  it('removes the event listener on unmount', () => {
    const mql = mockMatchMedia(false);
    const { unmount } = renderHook(() => useSystemColorScheme());
    unmount();
    expect(mql.removeEventListener).toHaveBeenCalledTimes(1);
  });
});
