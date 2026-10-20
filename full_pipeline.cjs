const { execSync, spawn, exec } = require('child_process');
const http = require('http');
const net = require('net');
const fs = require('fs');

const TV_DIR = process.env.LOCALAPPDATA + '\\tradingview-mcp';

function findExe() {
  const TV_EXE = TV_DIR + '\\TradingView.Desktop_3.3.0.7992_x64__n534cwy3pjxzj\\TradingView.exe';
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
      const chart = targets.find(t => t.url && t.url.includes('/chart/'));
      if (chart) return r(true);
      await new Promise(s => setTimeout(s, 3000));
    }
    r(false);
  });
}

function killTvProcesses() {
  return new Promise(r => {
    exec('taskkill /F /IM TradingView.exe', () => r());
    setTimeout(r, 2500);
  });
}

function runCmd(cmd, cwd = 'C:/HEBAT', timeout = 120000) {
  console.log(`\n>>>>> EKSEKUSI: ${cmd}`);
  try {
    const out = execSync(cmd, { cwd, stdio: 'inherit', timeout });
    console.log(`✅ SUKSES: ${cmd}`);
    return true;
  } catch (e) {
    console.log(`❌ GAGAL: ${cmd} - ${e.message}`);
    return false;
  }
}

async function ensureTvRunning() {
  console.log('\n========== 1. CEK & START TRADINGVIEW ==========');
  const exe = findExe();
  if (!exe) { console.error('TradingView.exe tidak ditemukan!'); return false; }

  const targets = await cdpTargets();
  const hasChart = targets.some(t => t.url && t.url.includes('/chart/'));
  const tvAlive = targets.length > 0;

  let started = false;
  if (!tvAlive) {
    console.log('>> TradingView mati - menyalakan dengan remote debugging...');
    spawn(exe, ['--remote-debugging-port=9222'], { detached: true, stdio: 'ignore' }).unref();
    started = true;
  } else if (!hasChart) {
    console.log('>> Port 9222 aktif tapi belum ada chart. Tunggu halaman chart...');
  } else {
    console.log('>> TradingView Desktop sudah aktif + chart siap.');
  }

  if (started || !tvAlive) {
    const ok = await waitCDP(60);
    if (!ok) {
      console.error('!! CDP 9222 tidak aktif setelah 2 menit. Restart paksa...');
      await killTvProcesses();
      spawn(exe, ['--remote-debugging-port=9222'], { detached: true, stdio: 'ignore' }).unref();
      const ok2 = await waitCDP(60);
      if (!ok2) { console.error('!! GAGAL total'); return false; }
    }
  }

  const chartOk = await waitChart(45);
  if (!chartOk) { console.error('!! Chart tidak ditemukan'); return false; }

  const t2 = await cdpTargets();
  const chart = t2.find(t => t.url && t.url.includes('/chart/'));
  console.log('>> Chart OK: ' + (chart ? chart.url : '?'));
  return true;
}

async function runPipeline() {
  const startTime = Date.now();
  console.log('>>> FULL PIPELINE TELEGRAM - START');
  console.log('=====================================');

  // 1. Ensure TradingView running
  const tvOk = await ensureTvRunning();
  if (!tvOk) { console.error('❌ TradingView gagal start'); return false; }

  // 2. Health check
  console.log('\n========== 2. HEALTH CHECK ==========');
  runCmd('node C:\\HEBAT\\tv_health_check.cjs');

  // 3. Cycle timeframes for PINE warm-up
  console.log('\n========== 3. CYCLE TIMEFRAMES (PINE WARM-UP) ==========');
  runCmd('node C:\\HEBAT\\cycle_tf_efficient.cjs');

  // 4. USD/XAU Correlation check
  console.log('\n========== 4. USD/XAU CORRELATION ==========');
  runCmd('node C:\\HEBAT\\usdxau_correlation.cjs');

  // 5. Ensure back on XAUUSD (switch_symbol defaults to XAUUSD if no arg)
  console.log('\n========== 5. PASTIKAN SYMBOL XAUUSD ==========');
  runCmd('node C:\\HEBAT\\switch_symbol.cjs OANDA:XAUUSD');

  // 6. Full analysis (PINE + SMC)
  console.log('\n========== 6. ANALISA GABUNGAN (FULL SCAN) ==========');
  runCmd('node C:\\HEBAT\\analisa_gabungan.cjs');

  // 7. Update overlay
  console.log('\n========== 7. UPDATE OVERLAY POSISI LIVE ==========');
  runCmd('node C:\\HEBAT\\overlay_position.cjs');

  // 8. Start monitor if not running
  console.log('\n========== 8. START MONITOR LIMIT XAU ==========');
  const LOCK = 'C:/HEBAT/monitor.lock';
  let monitorRunning = false;
  try {
    const pid = parseInt(fs.readFileSync(LOCK, 'utf8'));
    process.kill(pid, 0);
    monitorRunning = true;
    console.log('>> Monitor sudah jalan (PID ' + pid + ') - tidak diduplikasi.');
  } catch (e) { monitorRunning = false; }
  if (!monitorRunning) {
    const child = spawn(process.execPath, ['C:\\HEBAT\\monitor_limit_xau.cjs'], { detached: true, stdio: 'ignore' });
    child.unref();
    try { fs.writeFileSync(LOCK, String(child.pid)); } catch (e) {}
    console.log('>> MONITOR LIMIT XAU V2: STARTED PID ' + child.pid + ' (log: monitor_limit_xau.log)');
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=====================================');
  console.log(`>>> FULL PIPELINE SELESAI (${totalTime}s)`);
  console.log('>>> Semua sistem AKTIF & SIAP TRADING');
  return true;
}

runPipeline().then(ok => {
  process.exit(ok ? 0 : 1);
}).catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});