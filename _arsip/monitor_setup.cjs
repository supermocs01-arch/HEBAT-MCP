const http = require('http');
const fs = require('fs');
const LOG = 'C:/HEBAT/monitor_setup.log';
const ALERT = 'C:/HEBAT/alert_setup.log';

function log(msg) {
  const line = '[' + new Date().toISOString().slice(11, 19) + ' WIB ' + new Date().toISOString().slice(0, 10) + '] ' + msg;
  console.log(line);
  fs.appendFileSync(LOG, line + '\n');
}

let prev = { sig: '', alerted: false };

async function check() {
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
      var n=bars.length;
      var last=bars[n-1].value;
      var st=null;
      try{var s=wv.getStudyById('PTdIuB');var src=s._study||s;var g=src._graphics||(src._source&&src._source._graphics);var pc=g._primitivesCollection;var col=pc.dwglabels.get('labels').get(false)._primitivesDataById;col.forEach(function(l){if(l.t&&l.t.indexOf('PINE_DATA')===0)st=l.t});}catch(e){}
      var high=0;
      for(var i=n-100;i<n;i++){var v=bars[i].value[2];if(v>high)high=v}
      return JSON.stringify({price:last[4],high:high,pine:st});
    })()`, returnByValue: true });
    const v = JSON.parse(r.result.value);
    const pd = v.pine ? v.pine.split('|') : null;
    const sig = pd ? pd[3] : '?';
    const rsi = pd ? parseFloat(pd[2]) : null;
    if (!v.price || v.price < 100 || v.price > 10000) {
      log('CHART BELUM SIAP/SALAH - harga=' + v.price + ' (bukan XAUUSD) - TIDAK DIPROSES');
      ws.ws.close();
      return;
    }
    const pullbackPct = v.high > 0 ? ((v.high - v.price) / v.high * 100) : 0;

    if (sig === 'BUY' || sig === 'SELL') {
      const line = 'SETUP BARU: ' + sig + ' | harga=' + v.price.toFixed(2) + ' RSI=' + rsi + ' pullback=' + pullbackPct.toFixed(1) + '%';
      log('*** ' + line + ' ***');
      fs.appendFileSync(ALERT, '[' + new Date().toISOString() + '] ' + line + '\n');
    } else if (pullbackPct >= 1.5) {
      log('PULLBACK DALAM ' + pullbackPct.toFixed(1) + '% dari high ' + v.high.toFixed(2) + ' | harga=' + v.price.toFixed(2) + ' RSI=' + rsi + ' sig=' + sig + ' - PERLU ANALISIS ULANG MTF');
    } else {
      log('tunggu setup | harga=' + v.price.toFixed(2) + ' RSI=' + rsi + ' sig=' + sig + ' pullback=' + pullbackPct.toFixed(1) + '%');
    }
  } catch (e) {
    log('ERROR: ' + e.message);
  } finally {
    ws.ws.close();
  }
}

(async () => {
  log('=== MONITOR SETUP BARU MULAI (cek tiap 15 menit) ===');
  await check();
  setInterval(check, 900000);
  setTimeout(() => process.exit(0), 48 * 60 * 60 * 1000);
})();