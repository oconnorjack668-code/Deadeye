// src/components/ErrorReporter.tsx
'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/reportError';
import { detectPlayStoreApp } from '@/lib/platform';

/**
 * Reports uncaught errors and promise rejections that no error boundary caught.
 * Also records, on first load, whether Deadeye was opened as the Play Store app.
 */
export function ErrorReporter() {
  useEffect(() => {
    detectPlayStoreApp();
  }, []);

  useEffect(() => {
    // With no error object, where the browser says it happened is the only location there is
    const onError = (event: ErrorEvent) =>
      reportError('client', event.error || event.message, {
        at: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined,
      });
    const onRejection = (event: PromiseRejectionEvent) => reportError('client', event.reason);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return null;
}
