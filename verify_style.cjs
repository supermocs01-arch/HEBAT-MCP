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
      const r = await send('Runtime.evaluate', {
        expression: `(function(){
          var wv = window.TradingViewApi._activeChartWidgetWV.value();
          var st = wv._chartWidget.model().mainSeries().style();
          var so = st._styleObject || {};
          var bg = wv._chartWidget.model()._backgroundColor;
          var mainDiv = wv._chartWidget._mainDiv;
          return JSON.stringify({
            up: so._colorUp, down: so._colorDown, border: so._borderColor,
            bgModel: bg, bgDiv: mainDiv ? mainDiv.style.background : null
          });
        })()`,
        returnByValue: true
      });
      console.log(r.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });