// watch_selam.cjs - pantau harga & catat saat SELL 4065 tersentuh/TP/SL
// Jalan di background. Log -> watch_selam.log
const http = require('http');
const fs = require('fs');
const LOG = require('path').join(__dirname, 'watch_selam.log');

const LEVELS = {
  entry: 4065,
  sl: 4085,
  tp1: 4050,
  tp2: 4025
};
const ena = {
  entryHit: false,
  tp1Hit: false,
  tp2Hit: false,
  slHit: false
};

function log(msg) {
  const t = new Date().toISOString();
  fs.appendFileSync(LOG, '[' + t + '] ' + msg + '\n');
  console.log('[' + t + '] ' + msg);
}

function fetchPrice() {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const targets = JSON.parse(d);
          const chart = targets.find(t => t.url && t.url.includes('/chart/'));
          if (!chart) { resolve(null); return; }
          const WebSocket = require('ws');
          const ws = new WebSocket(chart.webSocketDebuggerUrl);
          let id = 1;
          function send(m, p) { return new Promise(r => { const mid = id++; const h = raw => { const resp = JSON.parse(raw.toString()); if (resp.id === mid) { ws.removeListener('message', h); r(resp.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); }); }
          ws.on('open', async () => {
            await send('Page.enable'); await send('Runtime.enable');
            const rr = await send('Runtime.evaluate', { expression: `(function(){var b=window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.model().mainSeries().bars();var n=b.size();var v=b.valueAt(n-1);return v?v[4]:null})()`, returnByValue: true });
            const p = parseFloat(rr.result.value);
            ws.close(); resolve(p);
          });
        } catch(e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function run() {
  log('Watcher SELL 4065 aktif. Entry ' + LEVELS.entry + ' | SL ' + LEVELS.sl + ' | TP1 ' + LEVELS.tp1 + ' | TP2 ' + LEVELS.tp2);
  while (true) {
    const p = await fetchPrice();
    if (p) {
      let s = 'Harga ' + p.toFixed(2);
      // entry hit
      if (!ena.entryHit && p >= LEVELS.entry) {
        ena.entryHit = true;
        s += ' | 🟠 LIMIT SELL 4065 TERISI!';
      }
      if (ena.entryHit && !ena.tp1Hit && p <= LEVELS.tp1) {
        ena.tp1Hit = true; s += ' | 🟢 TP1 4050 HIT! catat: bukitp1 4065 4050';
      }
      if (ena.entryHit && ena.tp1Hit && !ena.tp2Hit && p <= LEVELS.tp2) {
        ena.tp2Hit = true; s += ' | 🟢🟢 TP2 4027 HIT! catat: bukitp2 4065 4027';
      }
      if (ena.entryHit && !ena.slHit && p >= LEVELS.sl) {
        ena.slHit = true; s += ' | 🔴 SL 4085 HIT! catat: loss 4065 4085';
      }
      log(s);
      // stop jika sudah TP2 atau SL
      if (ena.tp2Hit || ena.slHit) {
        log('Selesai dipantau. Trade berakhir.');
        process.exit(0);
      }
    }
    await new Promise(r => setTimeout(r, 20000)); // 20 detik
  }
}

run().catch(e => { log('Error: ' + e.message); });