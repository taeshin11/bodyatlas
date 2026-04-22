'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';
import { createLogger } from '@/lib/logger';

const log = createLogger('install');

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      log.debug('already installed (standalone display-mode); skipping prompt');
      return;
    }

    let timerId: number | null = null;

    const handler = (e: Event) => {
      e.preventDefault();
      log.info('beforeinstallprompt received; prompt will show after 30s');
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (timerId !== null) window.clearTimeout(timerId);
      timerId = window.setTimeout(() => setShow(true), 30000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      log.warn('handleInstall called with no deferred prompt');
      return;
    }
    log.info('install prompt shown to user');
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      log.info(`user choice: ${outcome}`);
      if (outcome === 'accepted') setShow(false);
    } catch (e) {
      log.error('install prompt failed', e);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    log.info('install prompt dismissed by user');
    setShow(false);
    setDismissed(true);
  };

  if (dismissed || !show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-40 bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50 p-4"
      >
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Dismiss install prompt"
        >
          <X className="w-4 h-4 text-slate-400" aria-hidden="true" />
        </button>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">{t('install.title')}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t('install.desc')}</p>
            <button
              onClick={handleInstall}
              className="mt-2 px-4 py-1.5 text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-all shadow-sm hover:shadow-md"
            >
              {t('install.button')}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
