// src/lib/reportError.ts
// Browser-side crash reporting to /api/errors (stored in app_errors, viewed at /admin/errors).

/**
 * A request that never finished: the connection dropped, not a bug. Each
 * browser words it differently. "network error" is Chrome's when a response
 * stops part-way through - a page streaming in as an Android phone loses
 * signal. It reached the crash log twice from one player's dashboard on
 * 21 Oct 2026 because only "NetworkError" (no space) was listed.
 */
const CONNECTION = /Failed to fetch|NetworkError|network error|Load failed|network request failed/i;

const IGNORE = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i, // cross-origin script with no details
  /chrome-extension:|moz-extension:|safari-extension:/i,
  /AbortError|The user aborted a request/i,
  CONNECTION,
  // Scripts that in-app browsers and webviews inject into every page (not Deadeye code)
  /SCDynimacBridge|__gCrWeb|_AutofillCallbackHandler|webkit\.messageHandlers|WeixinJSBridge|zaloJSV2|instantSearchSDKJSBridge/,
];

/** True for errors that come from the browser or another app, not from Deadeye. */
export function isIgnoredError(text: string): boolean {
  return IGNORE.some((re) => re.test(text));
}

/** True when the error is a dropped connection, so the error screen can say so. */
export function isConnectionError(text: string): boolean {
  return CONNECTION.test(text);
}

const sent = new Set<string>();

export function reportError(
  source: 'client' | 'boundary',
  error: unknown,
  extra: { digest?: string; at?: string } = {}
) {
  if (typeof window === 'undefined') return;
  if (navigator.onLine === false) return;

  // A bare message - an error event the browser stripped of its error object,
  // which is what "Script error." always is - has no stack. It used to be
  // wrapped in new Error() here, and that gave it one: this function's own,
  // pointing at the line that made the Error rather than anything that failed.
  // Worse, the stack was appended to the text the ignore list is checked
  // against, so the anchored /^Script error\.?$/ could never match and every
  // one was stored: 6 from iPhones on the home and sign-in pages by 17 Oct 2026.
  const err = error instanceof Error ? error : null;
  const message = err
    ? `${err.name && err.name !== 'Error' ? `${err.name}: ` : ''}${err.message || 'Unknown error'}`
    : typeof error === 'string' && error
      ? error
      : 'Unknown error';
  const stack = err?.stack || extra.at || null;
  if (isIgnoredError(message) || isIgnoredError(`${message}\n${stack || ''}`)) return;

  // One report per distinct error per page load
  const key = `${message}|${location.pathname}`;
  if (sent.has(key) || sent.size > 20) return;
  sent.add(key);

  const body = JSON.stringify({
    source,
    message,
    stack,
    digest: extra.digest || null,
    url: location.pathname + location.search,
  });
  try {
    fetch('/api/errors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(
      () => undefined
    );
  } catch {
    // never let reporting cause another error
  }
}
