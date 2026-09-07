const http = require('http');
const WebSocket = require('ws');

http.get('http://127.0.0.1:9222/json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    if (!t) { console.log('No chart'); process.exit(1); }
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
        pending[mid] = { cb: r, timer: setTimeout(() => { delete pending[mid]; }, 8000) };
        ws.send(JSON.stringify({ id: mid, method: m, params: p || {} }));
      });
    }
    ws.on('open', async () => {
      await send('Runtime.enable');
      const expr = `(function(){
        try {
          var wv = window.TradingViewApi._activeChartWidgetWV.value();
          var pw = wv._chartWidget._paneWidgets._value[0];
          var bars = pw._state.m_dataSources[0]._seriesSource._data.m_bars._items;
          var n = bars.length;
          var o=[],h=[],l=[],c=[];
          for (var i = 0; i < n; i++) {
            var b = bars[i].value;
            o.push(b[1]); h.push(b[2]); l.push(b[3]); c.push(b[4]);
          }
          // Last 20 candles OHLC
          var last20 = [];
          for (var j = Math.max(0, n-20); j < n; j++) {
            last20.push({i: j, o: o[j], h: h[j], l: l[j], c: c[j]});
          }
          // Find key levels
          var allH = Math.max.apply(null, h);
          var allL = Math.min.apply(null, l);
          var recentH = Math.max.apply(null, h.slice(-50));
          var recentL = Math.min.apply(null, l.slice(-50));
          // Last 20 swings
          var swings = [];
          for (var k = Math.max(5, n-50); k < n-5; k++) {
            var isH = true, isL = true;
            for (var m = -5; m <= 5; m++) {
              if (m === 0) continue;
              if (h[k] <= h[k+m]) isH = false;
              if (l[k] >= l[k+m]) isL = false;
            }
            if (isH) swings.push({i: k, pr: h[k], ty: 'H'});
            if (isL) swings.push({i: k, pr: l[k], ty: 'L'});
          }
          // Volume analysis
          var vol = [];
          for (var v = 0; v < Math.min(n, 30); v++) {
            vol.push(bars[n-1-v].value[5] || 0);
          }
          var avgVol = vol.reduce((a,b)=>a+b,0) / vol.length;
          var lastVol = vol[0] || 0;
          return JSON.stringify({
            sym: 'HYPEUSDT.P',
            n: n, last: c[c.length-1],
            allH: allH, allL: allL,
            recentH: recentH, recentL: recentL,
            swings: swings.slice(-10),
            last20_close: last20.map(function(b){return b.c;}),
            avgVol: avgVol, lastVol: lastVol
          });
        } catch(e) { return JSON.stringify({err: e.message}); }
      })()`;
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      const data = JSON.parse(r?.result?.value);
      console.log('HYPE DETAIL:', JSON.stringify(data, null, 2));
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => { console.error('ERR:', e.message); process.exit(1); });
