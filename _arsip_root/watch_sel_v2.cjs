// watch_sel.v2.cjs - pantau SELL 4065, responsif 5 detik
const http = require('http');
const fs = require('fs');
const LOG = require('path').join(__dirname, 'watch_selam.log');

const entry = 4065, sl = 4085, tp1 = 4050, tp2 = 4025, breakout = 4072;
const st = { hit: false, tp1: false, tp2: false, sl: false };

function log(msg) {
  const t = new Date().toISOString();
  fs.appendFileSync(LOG, '[' + t + '] ' + msg + '\n');
  console.log('[' + t + '] ' + msg);
}

function getPrice() {
  return new Promise(r => {
    http.get('http://127.0.0.1:9222/json', res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
          if (!t) return r(null);
          const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 1;
          function send(m, p) { return new Promise(rr => { const mid = id++; const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); rr(j.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); }); }
          ws.on('open', async () => {
            await send('Page.enable'); await send('Runtime.enable');
            const rr = await send('Runtime.evaluate', { expression: `(function(){var b=window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.model().mainSeries().bars();var n=b.size();var v=b.valueAt(n-1);return v?v[4]:null})()`, returnByValue: true });
            ws.close(); r(parseFloat(rr.result.value));
          });
        } catch (e) { r(null); }
      });
    }).on('error', () => r(null));
  });
}

async function run() {
  log('Watcher v2 AKTIF (5 detik). SELL ' + entry + ' | SL ' + sl + ' | TP1 ' + tp1 + ' | TP2 ' + tp2 + ' | breakout ' + breakout);
  while (true) {
    const p = await getPrice();
    if (p) {
      let s = 'Harga ' + p.toFixed(2);
      if (!st.hit && p >= entry) { st.hit = true; s += ' | 🟠 LIMIT ' + entry + ' TERISI'; log(s); s = 'Harga ' + p.toFixed(2); }
      if (st.hit) {
        if (!st.tp1 && p <= tp1) { st.tp1 = true; s += ' | 🟢 TP1 ' + tp1 + ' HIT! catat bukitp1 ' + entry + ' ' + tp1; }
        if (st.tp1 && !st.tp2 && p <= tp2) { st.tp2 = true; s += ' | 🟢🟢 TP2 ' + tp2 + ' HIT! catat bukitp2 ' + entry + ' ' + tp2; }
        if (!st.sl && p >= sl) { st.sl = true; s += ' | 🔴 SL ' + sl + ' HIT! catat loss ' + entry + ' ' + sl; }
        if (!st.breakout && p >= breakout && p < sl) { st.breakout = true; s += ' | ⚠️ NAIK >' + breakout + ' SELL RISIKO, pindah SL ke BE (4068)'; }
        if (st.tp2 || st.sl) { log(s); log('SELESAI dipantau.'); process.exit(0); }
        if (!s.startsWith('Harga') || s.length > 30) log(s);
      }
    }
    await new Promise(r => setTimeout(r, 5000));
  }
}

run().catch(e => log('Error: ' + e.message));