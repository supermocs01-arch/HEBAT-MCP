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
          var data = [];
          // Get last 200 bars with timestamp
          for (var i = Math.max(0, n - 300); i < n; i++) {
            var b = bars[i].value;
            data.push({i: i, t: b[0], o: b[1], h: b[2], l: b[3], c: b[4]});
          }
          // Find D1 swing high and low in last 200 bars
          var hMax = 0, lMin = 99999, hIdx = 0, lIdx = 0;
          for (var j = Math.max(0, n - 200); j < n; j++) {
            if (bars[j].value[2] > hMax) { hMax = bars[j].value[2]; hIdx = j; }
            if (bars[j].value[3] < lMin) { lMin = bars[j].value[3]; lIdx = j; }
          }
          // Find last 10 high/low points
          var recent = data.slice(-15);
          return JSON.stringify({n: n, swingHigh: hMax, swingHighIdx: hIdx, swingLow: lMin, swingLowIdx: lIdx, recent: recent});
        } catch(e) { return JSON.stringify({err: e.message}); }
      })()`;
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      console.log('HISTORICAL:', r?.result?.value?.substring(0, 2000));
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => { console.error('ERR:', e.message); process.exit(1); });
