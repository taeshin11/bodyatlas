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
  { name: 'Bing',     url: 'https://www.bing.com/indexnow' },
  { name: 'Yandex',   url: 'https://yandex.com/indexnow' },
];

function ts() {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
}
function log(level, msg, extra) {
  const line = `[${ts()}] [${level}] [indexnow] ${msg}`;
  if (level === 'ERR' || level === 'WRN') console.warn(line, extra ?? '');
  else console.log(line, extra ?? '');
}

const runStart = Date.now();
log('STG', '============================================================');
log('STG', 'IndexNow submission START');
log('INF', `HOST=${HOST}`);
log('INF', `VERCEL=${process.env.VERCEL || '(unset)'} VERCEL_ENV=${process.env.VERCEL_ENV || '(unset)'}`);
log('INF', `urls=${urls.length} endpoints=${endpoints.length}`);

if (!process.env.VERCEL || process.env.VERCEL_ENV !== 'production') {
  log('SKP', 'not a Vercel production build; skipping');
  process.exit(0);
}

async function submitOne(ep) {
  const t0 = Date.now();
  log('INF', `POST -> ${ep.name} ${ep.url}`);
  let res;
  try {
    res = await fetch(ep.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const dt = Date.now() - t0;
    log('ERR', `${ep.name} network error after ${dt}ms: ${err.message}`);
    return false;
  }

  const dt = Date.now() - t0;
  const ok = res.status >= 200 && res.status < 300;
  log(ok ? 'OK ' : 'WRN', `${ep.name}: HTTP ${res.status} ${res.statusText} (${dt}ms)`);

  if (!ok) {
    try {
      const text = (await res.text()).slice(0, 500);
      log('WRN', `  body: ${text || '(empty)'}`);
    } catch (e) {
      log('WRN', `  body read failed: ${e.message}`);
    }
  }
  return ok;
}

async function submit() {
  const results = [];
  for (const ep of endpoints) {
    results.push({ name: ep.name, ok: await submitOne(ep) });
  }
  const okCount = results.filter(r => r.ok).length;
  const elapsed = Date.now() - runStart;
  log('STG', `submit summary: ${okCount}/${results.length} OK, ${elapsed}ms total`);
  for (const r of results) log('INF', `  ${r.name}: ${r.ok ? 'OK' : 'FAIL'}`);
  log('STG', 'IndexNow submission END');
  log('STG', '============================================================');
}

submit().catch((e) => {
  log('ERR', `submit() crashed: ${e.message}`);
  if (e.stack) log('ERR', e.stack);
  // Never fail the build
  process.exit(0);
});
