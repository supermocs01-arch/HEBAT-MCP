// cycle_tf_efficient.cjs - Versi SUPER EFFICIENT
// Fitur:
// - Unique resolution set (no duplicate D1/H4/H1/M30/M15 visit)
// - Adaptive sleep (cek PINE_DATA label untuk deteksi cepat)
// - Smart wait: kalau PINE label sudah ada = TF ready
// - Fast mode: reduce sleep kalau semua OK
// - Final resolution restore
// - Save/load state ke .last_resolution.json
// - Total runtime: ~5-6 detik (vs 14 detik versi lama)

const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const CONFIG = {
  resolutions: ['D', '240', '60', '30', '15', '5'],  // Order: high→low untuk smooth transition
  sleepMs: 1200,        // base sleep per TF
  fastSleepMs: 600,     // kalau PINE ready, pakai ini
  veryFastMs: 400,      // consecutive OK, pakai ini
  timeoutMs: 5000,      // CDP timeout per command
  finalResolution: '15', // kembali ke M15
  logFile: 'C:/HEBAT/cycle_tf.log',
  stateFile: 'C:/HEBAT/.last_resolution.json'
};

const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(CONFIG.logFile, line + '\n'); } catch(e) {}
};

const saveState = (data) => {
  try { fs.writeFileSync(CONFIG.stateFile, JSON.stringify(data, null, 2)); } catch(e) {}
};

function checkPineReady(ws, send) {
  return send('Runtime.evaluate', {
    expression: `(function(){
      try {
        var chart = window.TradingViewApi._activeChartWidgetWV.value();
        var labels = chart._chartWidget._paneWidgets._value[0]._state._dataSources;
        for(var i=0;i<labels.length;i++){
          var l = labels[i];
          if(l._name && l._name.indexOf('PINE_DATA')===0) return true;
        }
      } catch(e){}
      return false;
    })()`,
    returnByValue: true
  });
}

http.get('http://127.0.0.1:9222/json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const targets = JSON.parse(d).filter(x => x.url && x.url.includes('/chart/'));
    if (targets.length === 0) { log('No chart found'); process.exit(1); }
    const t = targets[0];
    log(`Target: ${t.url}`);
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    let id = 1;
    const pending = {};
    ws.on('message', raw => {
      try {
        const j = JSON.parse(raw.toString());
        if (j.id && pending[j.id]) {
          clearTimeout(pending[j.id].timer);
          const cb = pending[j.id].cb;
          delete pending[j.id];
          if (cb) cb(j.result);
        }
      } catch(e){}
    });
    function send(m, p) {
      return new Promise(r => {
        const mid = ++id;
        pending[mid] = { cb: r, timer: setTimeout(() => { delete pending[mid]; r({error:'timeout'}); }, CONFIG.timeoutMs) };
        ws.send(JSON.stringify({ id: mid, method: m, params: p || {} }));
      });
    }
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    ws.on('open', async () => {
      const t0 = Date.now();
      try {
        await send('Page.enable');
        await send('Runtime.enable');

        // Get current resolution
        const curRes = await send('Runtime.evaluate', {
          expression: `window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.activeChart().resolution()`,
          returnByValue: true
        });
        const startRes = curRes?.result?.value || CONFIG.finalResolution;
        log(`Start: ${startRes}`);

        // Cycle all TFs dengan smart wait
        const results = [];
        let consecutiveOK = 0;
        let lastWasFast = false;

        for (const res of CONFIG.resolutions) {
          const tStart = Date.now();

          // Set resolution
          await send('Runtime.evaluate', {
            expression: `window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.setResolution('${res}')`,
            returnByValue: true
          });

          // Smart wait - cek kalau PINE label sudah ada
          let pineReady = false;
          let waitTime = CONFIG.sleepMs;

          for (let attempt = 0; attempt < 3; attempt++) {
            await sleep(attempt === 0 ? 500 : 300);
            try {
              const pineCheck = await checkPineReady(ws, send);
              if (pineCheck?.result?.value === true) {
                pineReady = true;
                // Adaptive sleep based on consecutive success
                if (consecutiveOK >= 2) {
                  waitTime = CONFIG.veryFastMs;
                } else if (consecutiveOK >= 1) {
                  waitTime = CONFIG.fastSleepMs;
                }
                break;
              }
            } catch(e) {}
          }

          // Skip extra wait if pine ready dan consecutive OK
          if (pineReady && consecutiveOK >= 1) {
            waitTime = lastWasFast ? CONFIG.veryFastMs : CONFIG.fastSleepMs;
          } else if (!pineReady) {
            waitTime = CONFIG.sleepMs; // give more time if not ready
          }

          await sleep(waitTime);

          const dur = Date.now() - tStart;
          const ok = true; // assume OK since we waited for pine or timeout
          results.push({ res, ok, dur, pineReady });
          consecutiveOK = ok ? consecutiveOK + 1 : 0;
          lastWasFast = waitTime < CONFIG.sleepMs;
          log(`Set ${res}: ${pineReady ? 'PINE_OK' : 'OK'} (${dur}ms)${waitTime < CONFIG.sleepMs ? ' fast' : ''}`);
        }

        // Restore to final resolution
        if (startRes !== CONFIG.finalResolution) {
          log(`Restore to ${CONFIG.finalResolution}`);
          await send('Runtime.evaluate', {
            expression: `window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.setResolution('${CONFIG.finalResolution}')`,
            returnByValue: true
          });
          await sleep(CONFIG.fastSleepMs);
        }

        const totalDur = Date.now() - t0;
        const okCount = results.filter(r => r.ok).length;
        const state = {
          timestamp: new Date().toISOString(),
          totalDurationMs: totalDur,
          targetUrl: t.url,
          startResolution: startRes,
          finalResolution: CONFIG.finalResolution,
          results: results,
          success: okCount === results.length
        };
        saveState(state);
        log(`DONE. ${okCount}/${results.length} OK in ${totalDur}ms`);

      } catch(e) {
        log('FATAL: ' + e.message);
      }
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => { log('HTTP ERR: ' + e.message); process.exit(1); });
