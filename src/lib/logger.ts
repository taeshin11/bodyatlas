/**
 * Browser-side structured logger.
 *
 * Goals:
 *   - Easy to spot errors in DevTools (clear prefix, color, group, stack)
 *   - Won't blow up production console (debug suppressed in prod)
 *   - Same shape as the Python side (auto_monitor) so we can correlate
 *
 * Usage:
 *   const log = createLogger('AtlasViewer');
 *   log.info('loading', { dataPath });
 *   log.fetchError('GET /data/foo.json', err, { status: res.status });
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const PROD_MIN_LEVEL: Level = 'info';
const DEV_MIN_LEVEL: Level = 'debug';

const COLORS: Record<Level, string> = {
  debug: 'color:#94a3b8',
  info:  'color:#38bdf8',
  warn:  'color:#f59e0b;font-weight:bold',
  error: 'color:#ef4444;font-weight:bold',
};

function ts(): string {
  const d = new Date();
  return d.toISOString().slice(11, 23);
}

function isDev(): boolean {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') return true;
  return false;
}

function shouldLog(level: Level): boolean {
  const min = isDev() ? DEV_MIN_LEVEL : PROD_MIN_LEVEL;
  return LEVEL_RANK[level] >= LEVEL_RANK[min];
}

export interface Logger {
  debug: (msg: string, ctx?: Record<string, unknown>) => void;
  info:  (msg: string, ctx?: Record<string, unknown>) => void;
  warn:  (msg: string, ctx?: Record<string, unknown>) => void;
  error: (msg: string, err?: unknown, ctx?: Record<string, unknown>) => void;
  fetchError: (url: string, err: unknown, ctx?: Record<string, unknown>) => void;
  group: (label: string, body: () => void | Promise<void>) => void | Promise<void>;
}

export function createLogger(namespace: string): Logger {
  const tag = `%c[${namespace}]`;

  const emit = (level: Level, msg: string, ctx?: Record<string, unknown>) => {
    if (!shouldLog(level)) return;
    const line = `%c${ts()} ${tag} ${msg}`;
    const styles = ['color:#64748b', COLORS[level]];
    const out = ctx && Object.keys(ctx).length ? [line, ...styles, ctx] : [line, ...styles];
    if (level === 'error') console.error(...out);
    else if (level === 'warn') console.warn(...out);
    else if (level === 'debug') console.debug(...out);
    else console.info(...out);
  };

  return {
    debug: (msg, ctx) => emit('debug', msg, ctx),
    info:  (msg, ctx) => emit('info',  msg, ctx),
    warn:  (msg, ctx) => emit('warn',  msg, ctx),
    error: (msg, err, ctx) => {
      const merged: Record<string, unknown> = { ...(ctx || {}) };
      if (err instanceof Error) {
        merged.error = err.message;
        merged.stack = err.stack;
      } else if (err !== undefined) {
        merged.error = err;
      }
      emit('error', msg, merged);
    },
    fetchError: (url, err, ctx) => {
      const merged: Record<string, unknown> = { url, ...(ctx || {}) };
      if (err instanceof Error) {
        merged.error = err.message;
        merged.stack = err.stack;
      } else {
        merged.error = err;
      }
      emit('error', `fetch failed: ${url}`, merged);
    },
    group: (label, body) => {
      if (!shouldLog('debug')) return body();
      console.group(`${tag} ${label}`);
      try {
        const result = body();
        if (result instanceof Promise) {
          return result.finally(() => console.groupEnd());
        }
        console.groupEnd();
      } catch (e) {
        console.groupEnd();
        throw e;
      }
    },
  };
}

/**
 * Wrap a fetch call so errors surface with URL context.
 * Throws on non-2xx so callers can let errors propagate.
 */
export async function loggedFetch(
  log: Logger,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  log.debug(`fetch ${url}`);
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    log.fetchError(url, e, { phase: 'network' });
    throw e;
  }
  if (!res.ok) {
    log.fetchError(url, new Error(`HTTP ${res.status}`), {
      phase: 'http',
      status: res.status,
      statusText: res.statusText,
    });
  }
  return res;
}

/**
 * Install a global window.onerror + unhandledrejection listener.
 * Call once, e.g. in app/layout.tsx via a client-only init component.
 */
export function installGlobalErrorHandlers(log: Logger): () => void {
  if (typeof window === 'undefined') return () => {};

  const onError = (event: ErrorEvent) => {
    log.error('window.onerror', event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    log.error('unhandledrejection', event.reason);
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
