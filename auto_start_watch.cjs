// auto_start_watch.cjs - WATCHER: setiap kali TV Desktop menyala, otomatis
// pasang overlay + scan + monitor limit. Jalan terus di background.
// UPDATE 25 Aug: pakai overlay_position.cjs (data-driven), monitor pakai lock anti-dobel.
const { exec, spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const LOG = 'C:/HEBAT/auto_start_watch.log';
const LOCK = 'C:/HEBAT/monitor.lock';
let chartWasUp = false;
let monitorStarted = false;

function log(msg) {
  const line = '[' + new Date().toISOString().slice(0, 19) + '] ' + msg;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n'); } catch (e) {}
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

function monitorRunning() {
  // Cek lock: PID tertulis dan proses masih hidup?
  try {
    const pid = parseInt(fs.readFileSync(LOCK, 'utf8'));
    process.kill(pid, 0);
    return true;
  } catch (e) { return false; }
}

function startMonitor() {
  const child = spawn(process.execPath, ['C:\\HEBAT\\monitor_limit_xau.cjs'], { detached: true, stdio: 'ignore' });
  child.unref();
  try { fs.writeFileSync(LOCK, String(child.pid)); } catch (e) {}
  log('>>> Monitor v2 STARTED PID ' + child.pid);
}

function runScript(script) {
  return new Promise(r => {
    exec('node C:\\HEBAT\\' + script, { cwd: 'C:\\HEBAT' }, (err, stdout) => {
      log('  ' + script + ': ' + (err ? ('ERR ' + err.message) : 'OK'));
      r();
    });
  });
}

(async () => {
  log('=== AUTO-START WATCHER MULAI v2 (memantau TV setiap 15 detik) ===');
  while (true) {
    try {
      const targets = await cdpTargets();
      const chart = targets.find(t => t.url && t.url.includes('/chart/'));
      const chartUp = !!chart;

      if (chartUp && !chartWasUp) {
        log('>>> TV Desktop MENYALA - menjalankan overlay + scan...');
        monitorStarted = false;
        await runScript('overlay_position.cjs');
        await runScript('analisa_gabungan.cjs');
        log('>>> Overlay + scan selesai.');
      }

      if (chartUp && !monitorStarted && !monitorRunning()) {
        monitorStarted = true;
        log('>>> Monitor belum jalan - start dengan lock...');
        startMonitor();
      }

      chartWasUp = chartUp;
    } catch (e) {
      log('ERR loop: ' + e.message);
    }
    await new Promise(s => setTimeout(s, 15000));
  }
})();
