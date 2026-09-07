const http = require('http');
const fs = require('fs');

const LOG = 'C:/HEBAT/monitor_limit.log';
const LEVEL = { L1: 4084, L1_lo: 4083.0, L1_hi: 4088.6, SL1: 4077.5, confH1: 4093.9, invalidH1: 4077.7, chase: 4095 };

function log(msg) {
  const line = '[' + new Date().toISOString().slice(11, 19) + ' WIB ' + new Date().toISOString().slice(0, 10) + '] ' + msg;
  console.log(line);
  fs.appendFileSync(LOG, line + '\n');
}

function cdp() {
  return new Promise((resolve, reject) => {
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
}

async function check() {
  const { ws, send } = await cdp();
  await send('Runtime.enable');
  try {
    await send('Runtime.evaluate', { expression: `window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.setResolution('60')` });
    await new Promise(r => setTimeout(r, 3500));
    const h1 = await send('Runtime.evaluate', { expression: `(function(){
      var wv=window.TradingViewApi._activeChartWidgetWV.value();
      var pw=wv._chartWidget._paneWidgets._value[0];
      var bars=pw._state.m_dataSources[0]._seriesSource._data.m_bars._items;
      var n=bars.length;
      var last=bars[n-1].value;
      var low=last[3], close=last[4];
      return JSON.stringify({close:close,low:low,open:last[1],high:last[2]});
    })()`, returnByValue: true });

    await send('Runtime.evaluate', { expression: `window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.setResolution('15')` });
    await new Promise(r => setTimeout(r, 3000));
    const m15 = await send('Runtime.evaluate', { expression: `(function(){
      var wv=window.TradingViewApi._activeChartWidgetWV.value();
      var pw=wv._chartWidget._paneWidgets._value[0];
      var bars=pw._state.m_dataSources[0]._seriesSource._data.m_bars._items;
      var n=bars.length;
      var last=bars[n-1].value;
      var st=null;
      try{
        var chart=wv;
        var s=chart.getStudyById('PTdIuB');
        var src=s._study||s;
        var g=src._graphics||(src._source&&src._source._graphics);
        var pc=g._primitivesCollection;
        var col=pc.dwglabels.get('labels').get(false)._primitivesDataById;
        var pd=null;
        col.forEach(function(l){if(l.t&&l.t.indexOf('PINE_DATA')===0)pd=l.t});
        st=pd;
      }catch(e){}
      return JSON.stringify({close:last[4],low:last[3],high:last[2],open:last[1],pine:st});
    })()`, returnByValue: true });

    const h = JSON.parse(h1.result.value);
    const m = JSON.parse(m15.result.value);
    const confH1 = h.close > LEVEL.confH1;
    const invalidH1 = h.low < LEVEL.invalidH1;
    const inZone = m.close >= LEVEL.L1_lo && m.close <= LEVEL.L1_hi;
    const chasing = m.close >= LEVEL.chase;
    const aboveL1 = m.close > LEVEL.L1_hi;

    let status;
    if (invalidH1) status = 'BATAL SEMUA BUY - H1 low < 4077.5 (struktur H4 rusak)';
    else if (!confH1) status = 'MENUNGGU H1 CHoCH-B tutup > 4093.9 - TIDAK PASANG LIMIT';
    else if (inZone) status = 'ZONA L1 TERPENUHI (4083-4088.6) - EKSEKUSI BUY 4084, SL 4077.5';
    else if (chasing) status = 'NO CHASE (>=4095, RSI extended) - TUNGGU pullback ke 4083-4088.6';
    else if (aboveL1) status = 'DI ATAS zona L1 - tunggu pullback ke 4083-4088.6';

    log('harga=' + m.close.toFixed(2) + ' | H1 close=' + h.close.toFixed(2) + ' (conf>4093.9:' + (confH1 ? 'Y' : 'N') + ') | H1 low=' + h.low.toFixed(2) + ' | RSI-PINE=' + (m.pine ? m.pine.split('|')[2] : '?') + ' | pineSig=' + (m.pine ? m.pine.split('|')[3] : '?') + ' => ' + status);
  } catch (e) {
    log('ERROR: ' + e.message);
  } finally {
    ws.close();
  }
}

(async () => {
  log('=== MONITOR LIMIT MULAI (cek tiap 5 menit, disiplin keras) ===');
  await check();
  setInterval(check, 300000);
  setTimeout(() => process.exit(0), 24 * 60 * 60 * 1000);
})();