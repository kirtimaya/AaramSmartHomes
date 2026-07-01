/**
 * FUNCTIONAL TESTS — Phase 1.4: platform/links (web adapter)
 *
 * What's tested:
 *   - openUrl calls window.open with the correct URL and safe options
 *   - openUrl is a no-op when window is undefined (SSR guard)
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { openUrl } from '../../platform/links';

describe('platform/links (web adapter)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls window.open with target _blank and noopener', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    await openUrl('https://aaram.space');
    expect(openSpy).toHaveBeenCalledWith('https://aaram.space', '_blank', 'noopener,noreferrer');
  });

  it('is a no-op when window is undefined', async () => {
    const original = globalThis.window;
    // @ts-expect-error simulating SSR
    delete globalThis.window;
    await expect(openUrl('https://aaram.space')).resolves.toBeUndefined();
    globalThis.window = original;
  });
});
