// __tests__/report-error.test.ts
import { describe, it, expect, vi } from 'vitest';
import { isConnectionError, isIgnoredError } from '@/lib/reportError';

describe('crash report filter', () => {
  it('ignores errors injected by in-app browsers and connection drops', () => {
    expect(isIgnoredError("ReferenceError: Can't find variable: SCDynimacBridge")).toBe(true);
    expect(isIgnoredError("ReferenceError: Can't find variable: __gCrWeb")).toBe(true);
    expect(isIgnoredError('TypeError: Failed to fetch')).toBe(true);
    expect(isIgnoredError('ResizeObserver loop completed with undelivered notifications.')).toBe(true);
  });

  it('treats every browser wording of a dropped connection as one', () => {
    // Chrome on Android, when a page stops streaming in part-way (21 Oct 2026)
    expect(isIgnoredError('TypeError: network error')).toBe(true);
    expect(isConnectionError('TypeError: network error')).toBe(true);
    expect(isConnectionError('TypeError: Load failed')).toBe(true); // Safari
    expect(isConnectionError('NetworkError when attempting to fetch resource.')).toBe(true); // Firefox
    expect(isConnectionError("TypeError: Cannot read properties of undefined (reading 'makes')")).toBe(false);
  });

  it('keeps real Deadeye errors', () => {
    expect(isIgnoredError("TypeError: Cannot read properties of undefined (reading 'makes')")).toBe(false);
    expect(isIgnoredError("ReferenceError: Can't find variable: shotZones")).toBe(false);
  });
});

describe('reportError', () => {
  // "Script error." arrives as a bare message with no error object. It used to
  // be wrapped in new Error(), whose stack was appended before the ignore list
  // was checked, so the anchored pattern for it never matched and every one
  // was stored - with a location pointing at the reporter itself.
  it('drops "Script error." instead of storing it', async () => {
    const { reportError } = await import('@/lib/reportError');
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null));
    vi.stubGlobal('fetch', fetchSpy);
    reportError('client', 'Script error.', { at: 'https://x/_next/chunk.js:1:15255' });
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('reports a bare message with where the browser says it happened, not a made-up stack', async () => {
    const { reportError } = await import('@/lib/reportError');
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null));
    vi.stubGlobal('fetch', fetchSpy);
    reportError('client', 'Uncaught thing went wrong', { at: 'https://x/_next/chunk.js:1:99' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.message).toBe('Uncaught thing went wrong');
    expect(body.stack).toBe('https://x/_next/chunk.js:1:99');
    vi.unstubAllGlobals();
  });
});
