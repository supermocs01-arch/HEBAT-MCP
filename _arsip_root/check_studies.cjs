const http = require('http');
const WebSocket = require('ws');

http.get('http://127.0.0.1:9222/json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const targets = JSON.parse(d);
    const chart = targets.find(t => t.url && t.url.includes('/chart/'));
    if (!chart) { console.log('No chart'); return; }
    const ws = new WebSocket(chart.webSocketDebuggerUrl);
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
        var wv=window.TradingViewApi._activeChartWidgetWV.value();
        var studies = wv.getAllStudies ? wv.getAllStudies() : [];
        var out = studies.map(function(s){return {id: s._id || s.id, name: s._name || s.name};});
        return JSON.stringify(out);
      })()`;
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      console.log('STUDIES ON CHART:');
      console.log(r?.result?.value || 'NONE');
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => { console.error('ERR:', e.message); process.exit(1); });
