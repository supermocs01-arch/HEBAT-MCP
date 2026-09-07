const http = require('http');
const fs = require('fs');
const LOG = 'C:/HEBAT/monitor_entry.log';
const CFG = 'C:/HEBAT/entry.json';

function log(msg) {
  const line = '[' + new Date().toISOString().slice(11, 19) + ' WIB ' + new Date().toISOString().slice(0, 10) + '] ' + msg;
  console.log(line);
  fs.appendFileSync(LOG, line + '\n');
}

async function check() {
  if (!fs.existsSync(CFG)) { log('entry.json tidak ada - monitor berhenti'); process.exit(0); }
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(CFG, 'utf8')); } catch (e) { log('entry.json rusak: ' + e.message); return; }

  const ws = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
        if (!t) return reject(new Error('no chart'));
        const ws = new (require('ws'))(t.webSocketDebuggerUrl);
        let id = 1;
        const send = (m, p) => new Promise(r => { const mid = id++; const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); r(j.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); });
        ws.on('open', () => resolve({ ws, send }));
      });
    }).on('error', reject);
  });
  await ws.send('Runtime.enable');
  try {
    const r = await ws.send('Runtime.evaluate', { expression: `(function(){
      var wv=window.TradingViewApi._activeChartWidgetWV.value();
      var pw=wv._chartWidget._paneWidgets._value[0];
      var bars=pw._state.m_dataSources[0]._seriesSource._data.m_bars._items;
      var n=bars.length; var v=bars[n-1].value;
      return v[4];
    })()`, returnByValue: true });
    const price = parseFloat(r.result.value);
    if (!price || price < 100 || price > 10000) { log('harga tidak valid: ' + price); ws.ws.close(); return; }

    const side = cfg.side;
    const entry = cfg.entry, sl = cfg.sl, tp1 = cfg.tp1, tp2 = cfg.tp2;
    const risk = Math.abs(entry - sl);
    const rr1 = Math.abs(tp1 - entry) / risk;
    const rr2 = Math.abs(tp2 - entry) / risk;
    log('harga=' + price.toFixed(2) + ' | entry ' + entry + ' SL ' + sl + ' TP1 ' + tp1 + ' (' + rr1.toFixed(2) + 'R) TP2 ' + tp2 + ' (' + rr2.toFixed(2) + 'R)');

    if (side === 'SELL') {
      if (price <= tp1) { log('*** TP1 KENA *** harga=' + price.toFixed(2)); if (price <= tp2) log('*** TP2 KENA *** harga=' + price.toFixed(2)); }
      if (price >= sl) log('*** STOP LOSS KENA *** harga=' + price.toFixed(2) + ' - DISIPLIN: cut');
    } else {
      if (price >= tp1) { log('*** TP1 KENA *** harga=' + price.toFixed(2)); if (price >= tp2) log('*** TP2 KENA *** harga=' + price.toFixed(2)); }
      if (price <= sl) log('*** STOP LOSS KENA *** harga=' + price.toFixed(2) + ' - DISIPLIN: cut');
    }
  } catch (e) {
    log('ERROR: ' + e.message);
  } finally {
    ws.ws.close();
  }
}

(async () => {
  log('=== MONITOR ENTRY MULAI (cek tiap 60 detik) ===');
  await check();
  setInterval(check, 60000);
  setTimeout(() => process.exit(0), 24 * 60 * 60 * 1000);
})();