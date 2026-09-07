const http = require('http');
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p) => new Promise(r => { const mid = id++; const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); r(j.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); });
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    ws.on('open', async () => {
      await send('Runtime.enable');
      await send('Runtime.evaluate', { expression: `window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.setResolution('15')` });
      await sleep(3000);
      await send('Runtime.evaluate', { expression: `window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.setResolution('60')` });
      await sleep(3000);
      const r = await send('Runtime.evaluate', {
        expression: `(function(){
          var wv = window.TradingViewApi._activeChartWidgetWV.value();
          var st = wv._chartWidget.model().mainSeries().style();
          var keys = [];
          for (var k in st) { if (typeof st[k] !== 'function') keys.push(k); }
          var so = st._styleObject || {};
          var sok = [];
          for (var k2 in so) sok.push(k2 + '=' + so[k2]);
          var cw = wv._chartWidget;
          return JSON.stringify({
            styleKeys: keys.slice(0,40),
            styleObject: sok.slice(0,60),
            modelBg: wv._chartWidget.model()._backgroundColor
          });
        })()`,
        returnByValue: true
      });
      console.log(r.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });