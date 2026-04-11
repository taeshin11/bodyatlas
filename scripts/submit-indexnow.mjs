#!/usr/bin/env node
// Auto-submit all site URLs to IndexNow-participating search engines
// (Bing, Yandex, Seznam, etc.) on every Vercel deployment.
//
// Runs as `postbuild` script so it only executes on Vercel builds,
// not local dev. Non-fatal: a failure to submit won't break the build.

const HOST = 'bodyatlas-ten.vercel.app';
const KEY = '80e55dd3615c60d5ba034ac04a684c496c142f277c1642a1694f2b4508c2366c';
const KEY_LOC = `https://${HOST}/${KEY}.txt`;

const urls = [
  `https://${HOST}/`,
  `https://${HOST}/about`,
  `https://${HOST}/how-to-use`,
  `https://${HOST}/download`,
  `https://${HOST}/privacy`,
  `https://${HOST}/terms`,
];

const body = {
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOC,
  urlList: urls,
};

const endpoints = [
  { name: 'IndexNow', url: 'https://api.indexnow.org/IndexNow' },
  { name: 'Bing', url: 'https://www.bing.com/indexnow' },
  { name: 'Yandex', url: 'https://yandex.com/indexnow' },
];

// Only run on Vercel production builds
if (!process.env.VERCEL || process.env.VERCEL_ENV !== 'production') {
  console.log('[indexnow] Skipped (not a Vercel production build)');
  process.exit(0);
}

async function submit() {
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(body),
      });
      console.log(`[indexnow] ${ep.name}: HTTP ${res.status}`);
    } catch (err) {
      console.warn(`[indexnow] ${ep.name} failed:`, err.message);
    }
  }
}

submit().catch((e) => {
  console.warn('[indexnow] error:', e.message);
  // Never fail the build
  process.exit(0);
});
