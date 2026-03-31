'use client';

import Link from 'next/link';
import { Brain, Upload, HelpCircle, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useI18n } from '@/lib/i18n-context';

interface HeaderProps {
  hasVolume: boolean;
  onUploadNew: () => void;
}

export default function Header({ hasVolume, onUploadNew }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-indigo-500" />
          <span className="text-lg font-semibold tracking-tight text-slate-900">BrainAxis</span>
          <span className="hidden sm:inline text-xs text-slate-400 ml-2">{t('app.tagline')}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Desktop nav */}
          <Link
            href="/how-to-use"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {t('header.guide')}
          </Link>
          <Link
            href="/about"
            className="hidden sm:inline-block px-2.5 py-1.5 rounded-lg text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            {t('header.about')}
          </Link>
          {hasVolume && (
            <button
              onClick={onUploadNew}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all duration-200"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('header.newUpload')}</span>
            </button>
          )}
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="sm:hidden overflow-hidden border-t border-slate-200/60 bg-white/95 backdrop-blur-xl"
          >
            <nav className="px-4 py-3 space-y-1">
              <Link
                href="/how-to-use"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <HelpCircle className="w-4 h-4 text-indigo-500" />
                {t('header.guide')}
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Brain className="w-4 h-4 text-indigo-500" />
                {t('header.about')}
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
