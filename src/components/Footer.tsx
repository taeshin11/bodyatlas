'use client';

import { useI18n } from '@/lib/i18n-context';

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-slate-200/60 bg-white/50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-1">
        <span className="hover:text-slate-600 transition-colors">{t('footer.builtBy')}</span>
        <span>&copy; {new Date().getFullYear()} BodyAtlas</span>
      </div>
    </footer>
  );
}
