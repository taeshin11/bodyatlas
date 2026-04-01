'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { detectLocale, t } from '@/lib/i18n';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      const locale = detectLocale();
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{t(locale, 'error.title')}</h2>
          <p className="text-sm text-slate-600 mb-4 max-w-md">
            {t(locale, 'error.message')}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors"
          >
            {t(locale, 'error.refresh')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
