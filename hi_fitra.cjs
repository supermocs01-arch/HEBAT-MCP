const { execSync, spawn, exec } = require('child_process');
const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');

const H = __dirname;
const TV_DIR = (process.env.LOCALAPPDATA || '') + '\\tradingview-mcp';
const TV_EXE = TV_DIR + '\\TradingView.Desktop_3.3.0.7992_x64__n534cwy3pjxzj\\TradingView.exe';
const LOGF = path.join(H, '_hi_fitra_run.log');

try { fs.writeFileSync(LOGF, ''); } catch (e) {}
function L(msg) {
  const line = '[' + new Date().toISOString().slice(0, 19).replace('T', ' ') + '] ' + msg;
  console.log(line);
  try { fs.appendFileSync(LOGF, line + '\n'); } catch (e) {}
}
function run(label, cmd, timeout) {
  L('>> ' + label);
  try { execSync(cmd, { stdio: 'inherit', timeout: timeout || 1200000, windowsHide: true }); }
  catch (e) { L('!! ' + label + ' gagal: ' + (e.message || e)); }
}

process.on('unhandledRejection', e => L('UNHANDLED: ' + (e && e.message ? e.message : e)));
process.on('uncaughtException', e => L('UNCAUGHT: ' + (e && e.message ? e.message : e)));

function findExe() {
  if (fs.existsSync(TV_EXE)) return TV_EXE;
  try {
    const dirs = fs.readdirSync(TV_DIR).filter(d => d.startsWith('TradingView.Desktop_'));
    for (const d of dirs) {
      const p = TV_DIR + '\\' + d + '\\TradingView.exe';
      if (fs.existsSync(p)) return p;
    }
  } catch (e) {}
  return null;
}

function cdpTargets() {
  return new Promise(r => {
    http.get('http://127.0.0.1:9222/json', res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { r(JSON.parse(d)); } catch (e) { r([]); } });
    }).on('error', () => r([]));
  });
}

function waitCDP(retries = 60) {
  return new Promise(r => {
    function check(attempt) {
      if (attempt >= retries) { r(false); return; }
      const sock = new net.Socket();
      sock.setTimeout(1000);
      sock.on('connect', () => { sock.destroy(); r(true); });
      sock.on('error', () => { sock.destroy(); setTimeout(() => check(attempt + 1), 2000); });
      sock.connect(9222, '127.0.0.1');
    }
    check(0);
  });
}

function waitChart(retries = 45) {
  return new Promise(async r => {
    for (let i = 0; i < retries; i++) {
      const targets = await cdpTargets();
      if (targets.find(t => t.url && t.url.includes('/chart/'))) return r(true);
      await new Promise(s => setTimeout(s, 3000));
    }
    r(false);
  });
}

function killTvProcesses() {
  return new Promise(r => {
    exec('taskkill /F /IM TradingView.exe', { windowsHide: true }, () => r());
    setTimeout(r, 2500);
  });
}

// Cek PID hidup TANPA process.kill (penyebab error "Unknown: ChildProcess.kill" di Windows)
function pidInfo(pid) {
  if (!pid || isNaN(pid)) return null;
  try {
    const out = execSync('tasklist /FI "PID eq ' + pid + '" /NH', { encoding: 'utf8', timeout: 15000, windowsHide: true });
    const line = out.split(/\r?\n/).find(l => l.includes(String(pid)));
    if (!line) return null;
    return line.trim().split(/\s+/)[0];
  } catch (e) { return null; }
}

(async () => {
  L('>>> HI FITRA - MODE SIAGA OTOMATIS');

  const exe = findExe();
  if (!exe) { L('TradingView.exe tidak ditemukan!'); process.exit(1); }

  // Backup data harian (retensi 14 hari)
  run('Backup data (_backup)', 'node "' + path.join(H, 'backup_data.cjs') + '"', 60000);

  const targets = await cdpTargets();
  const hasChart = targets.some(t => t.url && t.url.includes('/chart/'));
  const tvAlive = targets.length > 0;

  let started = false;
  if (!tvAlive) {
    L('>> TradingView mati - menyalakan dengan remote debugging...');
    spawn(exe, ['--remote-debugging-port=9222'], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    started = true;
  } else if (!hasChart) {
    L('>> Port 9222 aktif tapi belum ada chart. Tunggu halaman chart...');
  } else {
    L('>> TradingView Desktop sudah aktif + chart siap.');
  }

  if (started || !tvAlive) {
    const ok = await waitCDP(60);
    if (!ok) {
      L('!! CDP 9222 tidak aktif setelah 2 menit. Restart paksa TV Desktop...');
      await killTvProcesses();
      spawn(exe, ['--remote-debugging-port=9222'], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
      const ok2 = await waitCDP(60);
      if (!ok2) { L('!! GAGAL total - buka manual via start_tv.cmd'); process.exit(1); }
    }
  }

  const chartOk = await waitChart(45);
  if (!chartOk) { L('!! Chart tidak ditemukan - mungkin terbuka di Chrome. Tutup Chrome dan jalankan lagi.'); process.exit(1); }

  const t2 = await cdpTargets();
  const chart = t2.find(t => t.url && t.url.includes('/chart/'));
  L('>> Chart OK: ' + (chart ? chart.url : '?'));

  // Auto-detect id indikator SMC (jebakan #13: id berubah setelah re-add)
  run('Deteksi pineStudyId', 'node "' + path.join(H, 'pine_study.cjs') + '"', 120000);

  // Event guard info
  try {
    const eg = require(path.join(H, 'event_guard.cjs'));
    L('>> ' + eg.text());
  } catch (e) { L('event_guard: ' + e.message); }

  run('Health check TradingView Desktop', 'node "' + path.join(H, 'tv_health_check.cjs') + '"', 300000);
  run('Pasang overlay POSISI LIVE', 'node "' + path.join(H, 'overlay_position.cjs') + '"', 120000);
  run('Scan gabungan (D1/H4/H1/M15 + PINE)', 'node "' + path.join(H, 'analisa_gabungan.cjs') + '"', 1800000);

  // Monitor: cek PID hidup + pastikan itu node.exe (bukan PID bekas)
  const LOCK = path.join(H, 'monitor.lock');
  let monitorRunning = false;
  let pid = NaN;
  try { pid = parseInt(fs.readFileSync(LOCK, 'utf8')); } catch (e) {}
  const pname = pidInfo(pid);
  if (pname && /node/i.test(pname)) {
    monitorRunning = true;
    L('>> Monitor sudah jalan (PID ' + pid + ') - tidak diduplikasi.');
  } else if (pname) {
    L('>> monitor.lock menunjuk PID ' + pid + ' (' + pname + ') yang bukan monitor - lock dibersihkan.');
    try { fs.unlinkSync(LOCK); } catch (e) {}
  }

  if (!monitorRunning) {
    const child = spawn(process.execPath, [path.join(H, 'monitor_limit_xau.cjs')], { detached: true, stdio: 'ignore', windowsHide: true, cwd: H });
    child.unref();
    try { fs.writeFileSync(LOCK, String(child.pid)); } catch (e) {}
    L('>> MONITOR XAU: STARTED PID ' + child.pid + ' (log: monitor_limit_xau.log)');
  }

  L('>>> SIAP - TV + overlay + scan + monitor: AKTIF.');
  process.exit(0);
})();
