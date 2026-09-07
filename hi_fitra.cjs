const { execSync, spawn, exec } = require('child_process');
const http = require('http');
const net = require('net');
const fs = require('fs');

const TV_DIR = process.env.LOCALAPPDATA + '\\tradingview-mcp';
const TV_EXE = TV_DIR + '\\TradingView.Desktop_3.3.0.7992_x64__n534cwy3pjxzj\\TradingView.exe';

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

(async () => {
  console.log('>>> HI FITRA - MODE SIAGA OTOMATIS');

  const exe = findExe();
  if (!exe) { console.error('TradingView.exe tidak ditemukan!'); process.exit(1); }

  const targets = await cdpTargets();
  const hasChart = targets.some(t => t.url && t.url.includes('/chart/'));
  const isChrome = targets.some(t => t.type === 'page' && t.url && t.url.includes('tradingview.com'));
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
      console.error('!! CDP 9222 tidak aktif setelah 2 menit. Restart paksa TV Desktop...');
      await killTvProcesses();
      spawn(exe, ['--remote-debugging-port=9222'], { detached: true, stdio: 'ignore' }).unref();
      const ok2 = await waitCDP(60);
      if (!ok2) { console.error('!! GAGAL total - buka manual via start_tv.cmd'); process.exit(1); }
    }
  }

  const chartOk = await waitChart(45);
  if (!chartOk) {
    console.error('!! Chart tidak ditemukan - mungkin terbuka di Chrome. Tutup Chrome dan jalankan lagi.');
    process.exit(1);
  }

  const t2 = await cdpTargets();
  const chart = t2.find(t => t.url && t.url.includes('/chart/'));
  console.log('>> Chart OK: ' + (chart ? chart.url : '?'));

    console.log('>> Health check TradingView Desktop...');
  try { execSync('node C:\\HEBAT\\tv_health_check.cjs', { stdio: 'inherit' }); } catch (e) { console.log('health: ' + e.message); }

  console.log('>> Pasang overlay POSISI LIVE...');
  try { execSync('node C:\\HEBAT\\overlay_position.cjs', { stdio: 'inherit' }); } catch (e) { console.log('overlay: ' + e.message); }

  console.log('>> Scan gabungan (D1/H4/H1/M15 + PINE)...');
  try { execSync('node C:\\HEBAT\\analisa_gabungan.cjs', { stdio: 'inherit' }); } catch (e) { console.log('scan: ' + e.message); }

  console.log('>> Monitor limit v2 (baca overlay_plan.json + posisi.json)...');
  const LOCK = 'C:/HEBAT/monitor.lock';
  let monitorRunning = false;
  try {
    const pid = parseInt(fs.readFileSync(LOCK, 'utf8'));
    process.kill(pid, 0); // lempar error kalau proses mati
    monitorRunning = true;
    console.log('>> Monitor sudah jalan (PID ' + pid + ') - tidak diduplikasi.');
  } catch (e) { monitorRunning = false; }
  if (!monitorRunning) {
    const child = spawn(process.execPath, ['C:\\HEBAT\\monitor_limit_xau.cjs'], { detached: true, stdio: 'ignore' });
    child.unref();
    try { fs.writeFileSync(LOCK, String(child.pid)); } catch (e) {}
    console.log('>> MONITOR LIMIT XAU V2: STARTED PID ' + child.pid + ' (log: monitor_limit_xau.log)');
  }

  console.log('');
  console.log('>>> SIAP - semua otomatis sudah jalan.');
  console.log('>>> TV + overlay + scan + monitor: AKTIF otomatis.');
})();