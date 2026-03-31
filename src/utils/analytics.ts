const _EP = process.env.NEXT_PUBLIC_SHEETS_WEBHOOK_URL || '';

export async function _post(data: Record<string, unknown>) {
  if (!_EP) return;
  try {
    const p = {
      browser: navigator.userAgent.split(' ').pop() || '',
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      page_url: window.location.pathname,
      ...data,
    };
    fetch(_EP, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    }).catch(() => {});
  } catch {
    // silence
  }
}

export function _pg(featureName: string) {
  _post({ action: 'premium_gate_hit', feature_attempted: featureName });
}
