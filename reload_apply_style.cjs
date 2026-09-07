const http = require('http');
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p) => new Promise(r => { const mid = id++; const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); r(j.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); });
    ws.on('open', async () => {
      await send('Runtime.enable');
      await send('Runtime.evaluate', {
        expression: `(function(){
          var wv = window.TradingViewApi._activeChartWidgetWV.value();
          var ov = wv._chartWidget._options && wv._chartWidget._options.overrides;
          return JSON.stringify({ overrides: ov || 'none' });
        })()`,
        returnByValue: true
      });
      await send('Page.enable');
      await send('Page.reload', { ignoreCache: false });
      console.log('RELOAD SENT');
      setTimeout(() => process.exit(0), 2000);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });