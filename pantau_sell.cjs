// pantau_sell.cjs - pantau zona SELL 4062-4064 (pullback M15 BOS-S), 5 detik
const http = require('http');
const fs = require('fs');
const LOG = require('path').join(__dirname, 'pantau_sell.log');

const ZL = 4062, ZH = 4064;      // zona entry
const SL = 4070, TP1 = 4047, TP2 = 4020, MISS = 4055;
let armed = true; const st = true;

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
  log('PANTU SELL AKTIF: zona 4062-4064 | SL 4070 | TP1 4047 | TP2 4020');
  while (true) {
    const p = await getPrice();
    if (p) {
      let act = null;
      if (st) {
        if (p >= ZL && p <= ZH) act = '🎯 ENTRY ZONE! harga ' + p.toFixed(2) + ' di 4062-4064. Entry SELL, SL 4070, TP 4047/4020. BUTUH CANDLE KONFIRMASI >=0.45';
        else if (p > ZH) act = '▲ Harga ' + p.toFixed(2) + ' DI ATAS zona - belum masuk, tunggu "pullback ke 4062-4064"';
        else if (p < 4055 && p > 4047) act = '▼ Harga ' + p.toFixed(2) + ' DI BAWAH zona - jika <4047 FINDAK KEJAR. Konfirmasi turun menuju TP1 4047';
      }
      if (p <= TP1 && st) { st = false; act = '🟢 TP1 4047 HIT! catat bukitp1. pantau TP2 4020 (manual)'; }
      if (act) log(act);
    }
    await new Promise(r => setTimeout(r, 5000));
  }
}

run().catch(e => log('Error: ' + e.message));