'use client';

import { useEffect } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('sw');

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      log.debug('serviceWorker not supported in this browser');
      return;
    }
    log.info('registering /sw.js');
    let updateTimer: number | null = null;
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        log.info('service worker registered', {
          scope: reg.scope,
          state: reg.active?.state,
        });
        reg.addEventListener('updatefound', () => {
          log.info('service worker update found');
          const installing = reg.installing;
          if (installing) {
            installing.addEventListener('statechange', () => {
              log.info('sw state change', { state: installing.state });
            });
          }
        });
        // Long-lived tabs (PWA kiosk, study session) only see SW updates
        // on next visit otherwise. Poll every hour; reg.update() is cheap
        // when nothing changed (HTTP 304 on sw.js).
        updateTimer = window.setInterval(() => {
          reg.update().catch(() => {});
        }, 60 * 60 * 1000);
      })
      .catch((e) => {
        log.error('service worker registration failed', e);
      });
    return () => {
      if (updateTimer !== null) window.clearInterval(updateTimer);
    };
  }, []);

  return null;
}
