const fs = require('fs');
const path = require('path');

const H = __dirname;
const ROOT = path.join(H, '_backup');
const RETENTION_DAYS = 14;
const FILES = [
  'posisi.json', 'entry_hari.json', 'overlay_plan.json', 'risk_calculator.json',
  'config.json', 'events.json', 'monitor_plan_state.json',
  'smc_ict_unified_v1.pine', 'pelajaran_sl.md'
];

const d = new Date();
const stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dest = path.join(ROOT, stamp);

fs.mkdirSync(dest, { recursive: true });
let copied = 0;
for (const f of FILES) {
  const src = path.join(H, f);
  if (fs.existsSync(src)) {
    try { fs.copyFileSync(src, path.join(dest, f)); copied++; } catch (e) {}
  }
}

let pruned = 0;
try {
  for (const name of fs.readdirSync(ROOT)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(name)) continue;
    const t = new Date(name + 'T00:00:00').getTime();
    if (Date.now() - t > RETENTION_DAYS * 86400000) {
      try { fs.rmSync(path.join(ROOT, name), { recursive: true, force: true }); pruned++; } catch (e) {}
    }
  }
} catch (e) {}

console.log('[backup] ' + copied + ' file -> _backup/' + stamp + (pruned ? ' | prune ' + pruned + ' folder lama' : ''));
