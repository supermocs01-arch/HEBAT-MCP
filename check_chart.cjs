const http = require('http');
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const targets = JSON.parse(d);
    const chart = targets.find(t => t.url && t.url.includes('/chart/') && !t.url.includes('doubleclick') && !t.url.includes('google'));
    if (!chart) { console.log('Chart not found'); process.exit(1); }
    const WebSocket = require('ws');
    const ws = new WebSocket(chart.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) { return new Promise(r => { const msgId = id++; const h = (raw) => { const resp = JSON.parse(raw.toString()); if (resp.id === msgId) { ws.removeListener('message', h); r(resp.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: msgId, method: m, params: p || {} })); }); }
    ws.on('open', async () => {
      await send('Page.enable');
      await send('Runtime.enable');
      
      const r0 = await send('Runtime.evaluate', { expression: `!!window.TradingViewApi` });
      console.log('TradingViewApi exists:', r0.result.value);
      
      const r1 = await send('Runtime.evaluate', { expression: `(function(){
        var api = window.TradingViewApi;
        var wv = api._activeChartWidgetWV;
        return wv ? 'ok' : 'no widget';
      })()`});
      console.log('Widget WV:', r1.result.value);

      const r2 = await send('Runtime.evaluate', { expression: `(function(){
        var api = window.TradingViewApi;
        var wv = api._activeChartWidgetWV.value();
        var cw = wv._chartWidget;
        var model = cw.model();
        var series = model.mainSeries();
        return series.symbol();
      })()`});
      console.log('Symbol:', r2.result.value);

      const r3 = await send('Runtime.evaluate', { expression: `(function(){
        var api = window.TradingViewApi;
        var wv = api._activeChartWidgetWV.value();
        var cw = wv._chartWidget;
        var model = cw.model();
        var s = model.series();
        if (!s) return 'no series';
        var bars = s.count();
        return 'bars: ' + bars;
      })()`});
      console.log('Bars:', r3.result.value);

      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
