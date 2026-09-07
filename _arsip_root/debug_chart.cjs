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
          var res = wv._chartWidget.model().mainSeries().resolution();
          var sym = wv._chartWidget.model().mainSeries().symbol();
          var b = wv._chartWidget.model().mainSeries().bars();
          return JSON.stringify({res: res, sym: sym, size: b.size(), firstT: b.size()>0?b.valueAt(0)[0]:null, lastT: b.size()>0?b.valueAt(b.size()-1)[0]:null});
        } catch(e) { return JSON.stringify({err: e.message}); }
      })()`;
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      console.log('CHART STATE:', r?.result?.value);
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => { console.error('ERR:', e.message); process.exit(1); });
