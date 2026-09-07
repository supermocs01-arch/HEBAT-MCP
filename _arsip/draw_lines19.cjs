const http = require('http');
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const targets = JSON.parse(d);
    const chart = targets.find(t => t.type === 'page' && t.url && t.url.includes('/chart/') && !t.url.includes('doubleclick'));
    if (!chart) { console.log('Chart not found'); process.exit(1); }
    const WebSocket = require('ws');
    const ws = new WebSocket(chart.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) {
      return new Promise(r => {
        const msgId = id++;
        const h = (raw) => { const resp = JSON.parse(raw.toString()); if (resp.id === msgId) { ws.removeListener('message', h); r(resp.result); } };
        ws.on('message', h);
        ws.send(JSON.stringify({ id: msgId, method: m, params: p || {} }));
      });
    }
    ws.on('open', async () => {
      await send('Page.enable');
      await send('Runtime.enable');

      // Find the drawing toolbar and activate horizontal line, then use price scale to place lines
      const r = await send('Runtime.evaluate', {
        expression: `(function() {
  try {
    var api = window.TradingViewApi;
    var wv = api._activeChartWidgetWV.value();
    var cw = wv._chartWidget;
    var model = cw.model();

    // Find the price scale to get Y coordinates
    var series = model.mainSeries();
    var priceScale = series._priceScale ? series._priceScale() : null;
    if (!priceScale) {
      // Try alternative access
      var paneWidget = cw._paneWidget;
      if (paneWidget) {
        var pwKeys = Object.keys(paneWidget).filter(function(k) { return k.indexOf('Scale')>=0||k.indexOf('scale')>=0||k.indexOf('Price')>=0; });
        return JSON.stringify({paneWidgetKeys: pwKeys});
      }
      return JSON.stringify({err: 'no priceScale'});
    }

    var psKeys = Object.keys(priceScale).filter(function(k) { return typeof priceScale[k]==='function'; });
    return JSON.stringify({priceScaleKeys: psKeys});
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
      });

      console.log(JSON.parse(r.result.value));
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
