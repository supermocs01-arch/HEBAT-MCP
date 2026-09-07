// auto_start_watch.cjs - WATCHER v3: auto cycle TF + overlay + scan + monitor
// UPDATE 7 Sep 2026: auto-cycle TF saat TV restart (fix PINE none bug)
const { exec, spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const LOG = 'C:/HEBAT/auto_start_watch.log';
const LOCK = 'C:/HEBAT/monitor.lock';
let chartWasUp = false;
let monitorStarted = false;
let cycleDone = false;

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
  log('>>> Monitor STARTED PID ' + child.pid);
}

function runScript(script, timeout = 60000) {
  return new Promise((r, reject) => {
    const child = exec('node C:\\HEBAT\\' + script, { cwd: 'C:\\HEBAT', timeout }, (err, stdout, stderr) => {
      if (err) {
        log('  ' + script + ': ERR ' + err.message);
        reject(err);
      } else {
        log('  ' + script + ': OK');
        r();
      }
    });
  });
}

function runScriptQuiet(script) {
  return new Promise(r => {
    exec('node C:\\HEBAT\\' + script, { cwd: 'C:\\HEBAT' }, (err) => {
      r();
    });
  });
}

(async () => {
  log('=== AUTO-START WATCHER v3 (auto-cycle TF on restart) ===');
  while (true) {
    try {
      const targets = await cdpTargets();
      const chart = targets.find(t => t.url && t.url.includes('/chart/'));
      const chartUp = !!chart;

      if (chartUp && !chartWasUp) {
        // TV just started/restarted
        log('>>> TV Desktop MENYALA - cycle TF + overlay + scan...');
        monitorStarted = false;
        cycleDone = false;

        // STEP 1: Cycle TF (PENTING - fix PINE none bug)
        try {
          await runScript('cycle_tf_efficient.cjs', 90000);
          cycleDone = true;
          log('>>> Cycle TF DONE');
        } catch(e) {
          log('>>> Cycle TF FAILED: ' + e.message + ' - continue anyway');
          cycleDone = true; // continue even if cycle fails
        }

        // STEP 2: Overlay (setelah cycle)
        try {
          await runScript('overlay_position.cjs', 30000);
        } catch(e) {
          log('>>> Overlay failed: ' + e.message);
        }

        // STEP 3: Analisa (setelah overlay)
        try {
          await runScript('analisa_gabungan.cjs', 60000);
        } catch(e) {
          log('>>> Scan failed: ' + e.message);
        }

        log('>>> Startup sequence COMPLETE');
      }

      // If TV was down then up, but cycle already done, just refresh overlay/scan
      if (chartUp && chartWasUp && !cycleDone) {
        try {
          await runScript('overlay_position.cjs', 30000);
          await runScript('analisa_gabungan.cjs', 60000);
          cycleDone = true;
        } catch(e) {}
      }

      // Start monitor if not running
      if (chartUp && !monitorStarted && !monitorRunning()) {
        monitorStarted = true;
        log('>>> Monitor not running - start...');
        startMonitor();
      }

      chartWasUp = chartUp;
    } catch (e) {
      log('ERR loop: ' + e.message);
    }
    await new Promise(s => setTimeout(s, 15000));
  }
})();
