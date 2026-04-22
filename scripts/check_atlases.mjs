#!/usr/bin/env node
// Atlas integrity check — verifies every atlas registered in
// src/components/RegionSelector.tsx (BODY_REGIONS) has a matching
// public/data/<id>/ folder with valid info.json + structures.json
// + at least 1 PNG slice per declared plane.
//
// Run: node scripts/check_atlases.mjs
// Exit 0 = all good; Exit 1 = at least one issue.
//
// Why: R20 deleted dead atlas folders that BODY_REGIONS had stopped
// referencing (brain-pet, spine-xray). The reverse — BODY_REGIONS
// referencing a missing folder — would surface as a runtime 404 in
// the user's browser. This script catches that locally / pre-deploy.

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REGION_FILE = join(ROOT, 'src/components/RegionSelector.tsx');
const DATA_ROOT = join(ROOT, 'public/data');

const issues = [];

function fail(msg) { issues.push(msg); }

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function pngsIn(dir) {
  try {
    const ents = await readdir(dir);
    return ents.filter(e => e.endsWith('.png')).length;
  } catch { return 0; }
}

const text = await readFile(REGION_FILE, 'utf-8');
const dataPaths = [...new Set([...text.matchAll(/dataPath:\s*'\/data\/([a-z0-9-]+)'/g)].map(m => m[1]))];

if (dataPaths.length === 0) {
  fail('parse error: no dataPath entries found in RegionSelector.tsx');
}

console.log(`registered atlases: ${dataPaths.length}`);
console.log(dataPaths.map(p => '  - ' + p).join('\n'));
console.log();

for (const id of dataPaths) {
  const dir = join(DATA_ROOT, id);
  if (!(await exists(dir))) { fail(`${id}: folder missing (${dir})`); continue; }

  const info = join(dir, 'info.json');
  const structures = join(dir, 'structures.json');
  if (!(await exists(info))) fail(`${id}: info.json missing`);
  if (!(await exists(structures))) fail(`${id}: structures.json missing`);

  let planes = [];
  try {
    const j = JSON.parse(await readFile(info, 'utf-8'));
    planes = Object.keys(j.planes || {});
  } catch (e) {
    fail(`${id}: info.json invalid JSON or no .planes (${e.message})`);
    continue;
  }

  if (planes.length === 0) fail(`${id}: info.json declares no planes`);
  for (const plane of planes) {
    const planeDir = join(dir, plane);
    const labelDir = join(dir, 'labels', plane);
    if (!(await exists(planeDir))) { fail(`${id}/${plane}/: folder missing`); continue; }
    const n = await pngsIn(planeDir);
    if (n === 0) fail(`${id}/${plane}/: 0 PNG slices`);
    if (!(await exists(labelDir))) fail(`${id}/labels/${plane}/: folder missing`);
  }

  try {
    const s = JSON.parse(await readFile(structures, 'utf-8'));
    if (!Array.isArray(s.structures)) fail(`${id}: structures.json missing .structures array`);
    else if (s.structures.length === 0) fail(`${id}: structures array empty`);
  } catch (e) {
    fail(`${id}: structures.json invalid JSON (${e.message})`);
  }
}

console.log();
if (issues.length === 0) {
  console.log(`OK — ${dataPaths.length} atlases all valid`);
  process.exit(0);
} else {
  console.error(`FAIL — ${issues.length} issue${issues.length > 1 ? 's' : ''}:`);
  for (const i of issues) console.error('  ✗ ' + i);
  process.exit(1);
}
