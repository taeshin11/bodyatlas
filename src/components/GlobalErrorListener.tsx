'use client';

import { useEffect } from 'react';
import { createLogger, installGlobalErrorHandlers } from '@/lib/logger';

const log = createLogger('global');

/**
 * Mount once at the app root. Installs window.onerror + unhandledrejection
 * handlers so silent JS failures show up as clear console.error entries.
 */
export default function GlobalErrorListener() {
  useEffect(() => {
    log.info('global error listener installed');
    const cleanup = installGlobalErrorHandlers(log);
    return cleanup;
  }, []);
  return null;
}
