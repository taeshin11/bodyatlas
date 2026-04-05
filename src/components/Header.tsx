'use client';

import Link from 'next/link';
import { BookOpen, HelpCircle, Download, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useI18n } from '@/lib/i18n-context';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-500" />
          <span className="text-lg font-semibold tracking-tight text-slate-900">BodyAtlas</span>
          <span className="hidden sm:inline text-xs text-slate-400 ml-2">Free Anatomy Atlas</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/download"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            {t('header.download')}
          </Link>
          <Link
            href="/about"
            className="hidden sm:inline-block px-2.5 py-1.5 rounded-lg text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            {t('header.about')}
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
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
                href="/download"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-indigo-600 font-medium hover:bg-indigo-50 transition-colors"
              >
                <Download className="w-4 h-4 text-indigo-500" />
                {t('header.download')}
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <HelpCircle className="w-4 h-4 text-indigo-500" />
                {t('header.about')}
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
