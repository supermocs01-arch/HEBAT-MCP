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

      // First remove old lines, then draw new ones
      await send('Runtime.evaluate', {
        expression: `(function() {
  try {
    var api = window.TradingViewApi;
    var wv = api._activeChartWidgetWV.value();
    var chartWidget = wv._chartWidget;
    var model = chartWidget.model();
    var series = model.mainSeries();
    // Remove old price lines
    try { series.removePriceLine('ENTRY 4030'); } catch(e) {}
    try { series.removePriceLine('SL 4010'); } catch(e) {}
    try { series.removePriceLine('TP1 4050'); } catch(e) {}
    try { series.removePriceLine('TP2 4110'); } catch(e) {}
    return JSON.stringify({success: true});
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
      });

      // Draw new lines
      const r = await send('Runtime.evaluate', {
        expression: `(function() {
  try {
    var api = window.TradingViewApi;
    var wv = api._activeChartWidgetWV.value();
    wv.createShape('horizontal_line', {
      text: 'ENTRY 4030', points: [{price: 4030}], color: '#00BFFF', linewidth: 2, lock: true
    });
    wv.createShape('horizontal_line', {
      text: 'SL 4020', points: [{price: 4020}], color: '#FF6347', linewidth: 1, lock: true
    });
    wv.createShape('horizontal_line', {
      text: 'TP1 4040', points: [{price: 4040}], color: '#00FF00', linewidth: 1, lock: true
    });
    wv.createShape('horizontal_line', {
      text: 'TP2 4070', points: [{price: 4070}], color: '#008080', linewidth: 1, lock: true
    });
    return JSON.stringify({success: true});
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
      });

      console.log(JSON.parse(r.result.value));
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
