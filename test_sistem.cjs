// Smoke test sistem HEBAT: audit + PINE + overlay DOM + monitor + event guard.
// Exit 1 kalau ada yang FAIL. Jalankan: node C:\HEBAT\test_sistem.cjs
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const H = __dirname;
const results = [];
function add(name, ok, detail) { results.push({ name, ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); }

function run(cmd, args, timeout) {
  try { return { ok: true, out: execFileSync(cmd, args, { encoding: 'utf8', timeout: timeout || 600000, windowsHide: true }) }; }
  catch (e) { return { ok: false, out: (e.stdout || '') + (e.stderr || '') + (e.message || '') }; }
}

console.log('=== SMOKE TEST SISTEM ===');

const t0 = Date.now();
const audit = run(process.execPath, [path.join(H, 'audit_system.cjs')], 600000);
const clean = (audit.out || '').replace(/\x1b\[[0-9;]*m/g, '');
const m = clean.match(/PASS:\s*(\d+)\s*\|\s*WARN:\s*(\d+)\s*\|\s*FAIL:\s*(\d+)/);
if (m) add('Audit sistem', Number(m[3]) === 0, 'PASS ' + m[1] + ' / WARN ' + m[2] + ' / FAIL ' + m[3]);
else add('Audit sistem', false, 'output tidak dikenali');

const det = run(process.execPath, [path.join(H, 'pine_study.cjs')], 120000);
let detJson = null;
try { detJson = JSON.parse(det.out); } catch (e) {}
add('Deteksi study id SMC', !!(detJson && detJson.ok), detJson ? (detJson.id + ' (' + detJson.name + ')') : 'gagal');

const pine = run(process.execPath, [path.join(H, 'baca_pine.cjs')], 120000);
const pm = (pine.out || '').match(/"(px|price)"\s*:\s*([\d.]+)/);
add('Baca PINE (label chart)', pine.ok && !!pm, pm ? 'harga ' + pm[2] : 'tidak ada data PINE');

const ov = run(process.execPath, [path.join(H, 'verify_overlay_dom.cjs')], 120000);
add('Overlay di DOM', /FOUND/.test(ov.out || ''), (ov.out || '').split('\n')[0].slice(0, 100));

let pid = NaN;
try { pid = parseInt(fs.readFileSync(path.join(H, 'monitor.lock'), 'utf8')); } catch (e) {}
let alive = false;
if (pid) {
  try {
    const tl = execFileSync('tasklist', ['/FI', 'PID eq ' + pid, '/NH'], { encoding: 'utf8', timeout: 15000, windowsHide: true });
    alive = /node\.exe/i.test(tl);
  } catch (e) {}
}
add('Monitor hidup', alive, alive ? 'PID ' + pid : 'PID ' + pid + ' tidak hidup / bukan node');

try {
  const EG = require(path.join(H, 'event_guard.cjs'));
  add('Event guard', true, EG.text());
} catch (e) { add('Event guard', false, e.message); }

const fails = results.filter(r => !r.ok).length;
console.log('---');
console.log((fails ? 'HASIL: ' + fails + ' GAGAL' : 'HASIL: SEMUA PASS') + ' (' + Math.round((Date.now() - t0) / 1000) + ' dtk)');
process.exit(fails ? 1 : 0);
