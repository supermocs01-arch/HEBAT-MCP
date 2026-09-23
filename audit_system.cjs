const fs = require('fs');
const http = require('http');
const { execSync } = require('child_process');

const H = 'C:/HEBAT';
const W = (s) => process.stdout.write(s);
const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', D = '\x1b[0m';
let pass = 0, warns = 0, fails = 0;

function ok(msg)   { pass++; W(`  ${G}✓${D} ${msg}\n`); }
function warn(msg) { warns++; W(`  ${Y}⚠${D} ${msg}\n`); }
function fail(msg) { fails++; W(`  ${R}✗${D} ${msg}\n`); }
function head(t)   { W(`\n${C}═══ ${t} ═══${D}\n`); }

// ===== 1. FILE EKSISTENSI =====
head('1. CORE SCRIPTS');
const core = [
  'analisa_gabungan.cjs', 'overlay_position.cjs', 'monitor_limit_xau.cjs',
  'hi_fitra.cjs', 'full_pipeline.cjs', 'cycle_tf_efficient.cjs',
  'switch_symbol.cjs', 'tv_health_check.cjs', 'usdxau_correlation.cjs',
  'verify_overlay_dom.cjs', 'auto_start_watch.cjs', 'remote_cmd.js',
  'baca_pine.cjs'
];
core.forEach(f => {
  const p = H + '/' + f;
  fs.existsSync(p) ? ok(`${f} ada`) : fail(`${f} HILANG!`);
});

head('2. DATA FILES (JSON valid)');
const jsonFiles = {
  'posisi.json': ['active', 'entry', 'sl', 'tp1', 'tp2', 'status'],
  'entry_hari.json': ['tanggal', 'entry_ke', 'sisa_jatah', 'loss_count'],
  'overlay_plan.json': ['active', 'title', 'plan_a_buy', 'plan_b_buy'],
  'risk_calculator.json': ['account', 'risk_management', 'lot_calculation'],
  'config.json': ['targetSymbol', 'targetBroker']
};
Object.entries(jsonFiles).forEach(([f, required]) => {
  const p = H + '/' + f;
  if (!fs.existsSync(p)) { fail(`${f} HILANG!`); return; }
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    const missing = required.filter(k => !(k in j));
    if (missing.length) warn(`${f}: field hilang: ${missing.join(', ')}`);
    else ok(`${f}: valid`);
  } catch (e) { fail(`${f}: JSON PARSE ERROR - ${e.message}`); }
});

// ===== 3. DATA FILE CHECKS =====
head('3. DATA INTEGRITY');
try {
  const p = JSON.parse(fs.readFileSync(H + '/posisi.json', 'utf8'));
  if (p.active && !p.entry) fail('posisi.json: active=true tapi entry kosong');
  else if (p.active) ok(`posisi aktif: ${p.title}`);
  else ok('posisi.json: tidak ada posisi aktif');
} catch (e) { fail(`posisi.json: ${e.message}`); }

try {
  const e = JSON.parse(fs.readFileSync(H + '/entry_hari.json', 'utf8'));
  const hari = new Date().toISOString().slice(0, 10);
  if (e.tanggal !== hari) warn(`entry_hari.json: tanggal ${e.tanggal} bukan hari ini (${hari})`);
  else ok(`entry_hari.json: tanggal hari ini`);
  if (e.sisa_jatah < 0) fail(`entry_hari.json: sisa jatah negatif!`);
  if (e.loss_count >= 2) warn(`entry_hari.json: sudah ${e.loss_count} loss, STOP Trading!`);
} catch (e) { fail(`entry_hari.json: ${e.message}`); }

try {
  const o = JSON.parse(fs.readFileSync(H + '/overlay_plan.json', 'utf8'));
  if (!o.active) warn('overlay_plan.json: active=false, tidak ada plan');
  else {
    const hasPlan = o.plan_a_sell || o.plan_a_buy || o.plan_b_buy;
    if (!hasPlan) warn('overlay_plan.json: active=true tapi tidak ada plan');
    else ok(`overlay_plan: ${o.title}`);
  }
  if (o.account && o.account.type !== 'standard') warn('overlay_plan: account type bukan standard');
} catch (e) { fail(`overlay_plan.json: ${e.message}`); }

try {
  const r = JSON.parse(fs.readFileSync(H + '/risk_calculator.json', 'utf8'));
  if (r.account.type !== 'standard') warn('risk_calculator: account type bukan standard');
  if (r.account.modal_usd !== 2200) warn('risk_calculator: modal bukan $2,200');
  if (r.risk_management.max_risk_per_trade_percent > 2) warn('risk_calculator: max risk > 2%');
  ok('risk_calculator.json: loaded');
} catch (e) { fail(`risk_calculator.json: ${e.message}`); }

// ===== 4. MONITOR PROCESS =====
head('4. MONITOR PROCESS');
const lockFile = H + '/monitor.lock';
if (!fs.existsSync(lockFile)) {
  warn('monitor.lock: tidak ada (monitor belum pernah jalan)');
} else {
  const pid = parseInt(fs.readFileSync(lockFile, 'utf8').trim());
  try {
    const result = execSync(`tasklist /FI "PID eq ${pid}" /NH`, { encoding: 'utf8', windowsHide: true });
    if (result.includes(String(pid))) ok(`monitor aktif: PID ${pid}`);
    else warn(`monitor: PID ${pid} sudah mati (stale lock)`);
  } catch (e) {
    try {
      const result = execSync(`tasklist /FI "PID eq ${pid}" /NH 2>&1`, { encoding: 'utf8', windowsHide: true });
      if (result.includes(String(pid))) ok(`monitor aktif: PID ${pid}`);
      else warn(`monitor: PID ${pid} tidak ditemukan`);
    } catch (e2) { warn(`monitor: tidak bisa cek PID ${pid}`); }
  }
}

// Cek log terbaru
try {
  const log = fs.readFileSync(H + '/monitor_limit_xau.log', 'utf8');
  const lines = log.trim().split('\n');
  const last = lines[lines.length - 1];
  const timeMatch = last.match(/\[(\d{2}:\d{2}:\d{2}) WIB (\d{4}-\d{2}-\d{2})\]/);
  if (timeMatch) {
    const logDate = timeMatch[2];
    const hari = new Date().toISOString().slice(0, 10);
    if (logDate !== hari) warn(`monitor log: data dari ${logDate} (bukan hari ini)`);
    else ok(`monitor log: data hari ini`);
  }
} catch (e) { warn('monitor.log: tidak bisa dibaca'); }

// ===== 5. TRADINGVIEW CDP =====
head('5. TRADINGVIEW CDP');
const cdpCheck = new Promise((resolve) => {
  const req = http.get('http://127.0.0.1:9222/json', { timeout: 3000 }, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      try {
        const targets = JSON.parse(d);
        const chart = targets.find(x => x.url && x.url.includes('/chart/'));
        if (chart) ok(`TradingView chart: ${chart.url.slice(0, 60)}...`);
        else warn('TradingView: tidak ada chart aktif');
        ok(`CDP targets: ${targets.length}`);
      } catch (e) { fail('CDP: parse error'); }
      resolve();
    });
  });
  req.on('error', () => { fail('CDP: TradingView tidak terhubung (port 9222)'); resolve(); });
  req.on('timeout', () => { fail('CDP: timeout'); req.destroy(); resolve(); });
});

// ===== 6. TRADINGVIEW EXE =====
head('6. TRADINGVIEW EXE');
const tvDir = (process.env.LOCALAPPDATA || '') + '\\tradingview-mcp';
if (fs.existsSync(tvDir)) {
  const dirs = fs.readdirSync(tvDir).filter(d => d.startsWith('TradingView.Desktop_'));
  if (dirs.length) {
    const tvExe = tvDir + '\\' + dirs[0] + '\\TradingView.exe';
    if (fs.existsSync(tvExe)) ok(`TradingView.exe: ${dirs[0]}`);
    else warn(`TradingView.exe: ${dirs[0]} tapi exe tidak ada`);
  } else fail('TradingView: tidak ada instalasi ditemukan');
} else fail('TradingView: direktori tidak ada');

// ===== 7. NODE MODULES =====
head('7. DEPENDENCIES');
['ws', 'node-telegram-bot-api'].forEach(mod => {
  const p = H + '/node_modules/' + mod;
  fs.existsSync(p) ? ok(`node_modules/${mod}`) : fail(`node_modules/${mod} HILANG! jalankan npm install`);
});

// ===== 8. CONFIG CHECK =====
head('8. CONFIG');
try {
  const c = JSON.parse(fs.readFileSync(H + '/config.json', 'utf8'));
  if (c.targetSymbol !== 'OANDA:XAUUSD' && c.targetSymbol !== 'XAUUSD') warn(`config: symbol ${c.targetSymbol} bukan XAUUSD`);
  if (c.targetBroker !== 'OANDA') warn(`config: broker ${c.targetBroker} bukan OANDA`);
  if (c.accountType !== 'standard') warn(`config: accountType ${c.accountType} (seharusnya standard)`);
  ok(`symbol: ${c.targetSymbol} | broker: ${c.targetBroker}`);
} catch (e) { fail(`config.json: ${e.message}`); }

// ===== 9. GIT STATUS =====
head('9. GIT');
try {
  const branch = execSync('git branch --show-current', { encoding: 'utf8', cwd: H, windowsHide: true }).trim();
  ok(`branch: ${branch}`);
  const status = execSync('git status --porcelain', { encoding: 'utf8', cwd: H, windowsHide: true }).trim();
  const changed = status ? status.split('\n').length : 0;
  if (changed > 0) warn(`${changed} file berubah (belum commit)`);
  else ok('semua file committed');
  const lastCommit = execSync('git log --oneline -1', { encoding: 'utf8', cwd: H, windowsHide: true }).trim();
  ok(`last commit: ${lastCommit}`);
} catch (e) { warn('git: tidak bisa cek status'); }

// ===== 10. RULE COMPLIANCE =====
head('10. RULE PATEN');
try {
  const p = JSON.parse(fs.readFileSync(H + '/posisi.json', 'utf8'));
  const e = JSON.parse(fs.readFileSync(H + '/entry_hari.json', 'utf8'));
  const o = JSON.parse(fs.readFileSync(H + '/overlay_plan.json', 'utf8'));

  if (e.loss_count >= 2) fail('⚠️ STOP TRADING: 2 loss sudah tercapai!');
  if (e.sisa_jatah <= 0) fail('⚠️ JATAH HABIS: tidak boleh entry lagi hari ini');
  if (p.active && p.sl && p.entry) {
    const slPips = Math.abs(parseFloat(p.entry) - parseFloat(p.sl));
    if (slPips > 50) warn(`SL terlalu jauh: ${slPips} pips dari entry`);
    else ok(`SL distance: ${slPips} pips`);
  }

  // Cek modal standard
  const r = JSON.parse(fs.readFileSync(H + '/risk_calculator.json', 'utf8'));
  if (r.account.type === 'standard' && r.account.modal_usd === 2200) {
    ok('Modal: $2,200 STANDARD ✓');
    if (r.risk_management.max_risk_per_trade_usd <= 44) ok('Max risk: $44 (2%) ✓');
    else warn('Max risk > $44!');
  }

  ok(`Entry hari ini: ${e.entry_ke}/3 | Loss: ${e.loss_count}/2 | Sisa: ${e.sisa_jatah}`);
} catch (e) { fail(`rule check: ${e.message}`); }

// ===== 11. LOG STALE CHECK =====
head('11. LOG FILES STALE CHECK');
const logDir = H;
const hari = new Date().toISOString().slice(0, 10);
const logs = ['_analisa_err.log', '_startup_out.log', '_hi_fitra_run.log'];
logs.forEach(f => {
  const p = logDir + '/' + f;
  if (fs.existsSync(p)) {
    const stat = fs.statSync(p);
    const mtime = stat.mtime.toISOString().slice(0, 10);
    if (mtime === hari) ok(`${f}: updated hari ini`);
    else warn(`${f}: terakhir update ${mtime}`);
  }
});

// ===== 12. PINE INDICATOR =====
head('12. PINE INDICATOR');
try {
  const log = fs.readFileSync(H + '/monitor_limit_xau.log', 'utf8');
  const pineMatches = log.match(/PINE=(\w+)/g);
  if (pineMatches) {
    const lastPine = pineMatches[pineMatches.length - 1];
    if (lastPine.includes('none')) warn('PINE: FLAT (belum warm-up atau indicator hilang)');
    else ok(`PINE: ${lastPine}`);
  } else warn('PINE: tidak ada data di monitor log');
} catch (e) { warn('PINE: tidak bisa cek'); }

// ===== SUMMARY =====
setTimeout(() => {
  W(`\n${C}══════════════════════════════════════════${D}\n`);
  W(`  ${G}PASS: ${pass}${D} | ${Y}WARN: ${warns}${D} | ${R}FAIL: ${fails}${D}\n`);
  if (fails === 0 && warns <= 3) W(`  ${G}✓ SISTEM SEHAT${D}\n`);
  else if (fails === 0) W(`  ${Y}⚠ SISTEM OK, tapi ada ${warns} warning${D}\n`);
  else W(`  ${R}✗ SISTEM ADA MASALAH! ${fails} error perlu diperbaiki${D}\n`);
  W(`${C}══════════════════════════════════════════${D}\n`);
  process.exit(0);
}, 4000);
