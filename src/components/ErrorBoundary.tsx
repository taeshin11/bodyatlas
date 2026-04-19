'use client';

import React from 'react';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { detectLocale, t } from '@/lib/i18n';
import { createLogger } from '@/lib/logger';

interface Props {
  children: React.ReactNode;
  /** Optional name to identify which boundary fired (helps when nested). */
  scope?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
  expanded: boolean;
}

const log = createLogger('ErrorBoundary');

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null, expanded: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const scope = this.props.scope || 'root';
    log.error(`React boundary [${scope}] caught`, error, {
      componentStack: info.componentStack,
    });
    this.setState({ componentStack: info.componentStack ?? null });
  }

  handleReload = () => {
    log.info('user clicked reload after boundary error');
    this.setState({ hasError: false, error: null, componentStack: null });
    if (typeof window !== 'undefined') window.location.reload();
  };

  toggleExpand = () => this.setState((s) => ({ expanded: !s.expanded }));

  render() {
    if (this.state.hasError) {
      const locale = detectLocale();
      const { error, componentStack, expanded } = this.state;
      const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{t(locale, 'error.title')}</h2>
          <p className="text-sm text-slate-600 mb-4 max-w-md">
            {t(locale, 'error.message')}
          </p>
          {error && (
            <div className="w-full max-w-2xl mb-4 text-left">
              <button
                onClick={this.toggleExpand}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-1"
              >
                {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span className="font-mono">{error.name}: {error.message}</span>
              </button>
              {expanded && (
                <pre className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-700 overflow-auto max-h-64 whitespace-pre-wrap">
{isDev && error.stack ? error.stack : error.message}
{componentStack ? '\n\n--- component stack ---' + componentStack : ''}
                </pre>
              )}
            </div>
          )}
          <button
            onClick={this.handleReload}
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
