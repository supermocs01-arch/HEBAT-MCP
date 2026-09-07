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

      // Try to get chart widget and create lines
      const r = await send('Runtime.evaluate', {
        expression: `(function() {
  try {
    var wv = window.TradingViewApi._activeChartWidgetWV.value();
    var chartWidget = wv._chartWidget;
    var model = chartWidget.model();

    var entry = 4030, sl = 4010, tp1 = 4050, tp2 = 4110;

    // Try createHorizontalLine on chart widget
    if (chartWidget.createHorizontalLine) {
      chartWidget.createHorizontalLine({ price: entry, color: '#00BFFF', text: 'ENTRY 4030', width: 2 });
      chartWidget.createHorizontalLine({ price: sl, color: '#FF6347', text: 'SL 4010', width: 2 });
      chartWidget.createHorizontalLine({ price: tp1, color: '#00FF00', text: 'TP1 4050', width: 2 });
      chartWidget.createHorizontalLine({ price: tp2, color: '#008080', text: 'TP2 4110', width: 2 });
      return JSON.stringify({ success: true, method: 'createHorizontalLine' });
    }

    // Try through model painter
    if (model.painter) {
      var painter = model.painter();
      painter.addLine(entry, '#00BFFF', 2, 'ENTRY');
      return JSON.stringify({ success: true, method: 'painter' });
    }

    // Try through widget's chart API
    try {
      var api = chartWidget.activeChart();
      if (api && api.createShape) {
        api.createShape({ shape: 'horizontal_line', lock: true, text: 'ENTRY 4030' }, { price: entry });
        return JSON.stringify({ success: true, method: 'createShape' });
      }
    } catch(e) {}

    // Use executeActionById to find drawing tools
    var acts = Object.keys(chartWidget._actions || {});
    var drawActs = acts.filter(function(a) { return a.indexOf('draw') >= 0 || a.indexOf('line') >= 0; });

    // Fallback: try to access internal line collection
    var lines = chartWidget._lines || chartWidget._horizontalLines;
    if (lines && lines.addLine) {
      lines.addLine(entry, 'ENTRY');
      return JSON.stringify({ success: true });
    }

    // List all keys on chartWidget and model that might help
    var cwKeys = Object.keys(chartWidget).filter(function(k) { return k.indexOf('ine') >= 0 || k.indexOf('raw') >= 0 || k.indexOf('Shape') >= 0 || k.indexOf('Line') >= 0 || k.indexOf('horiz') >= 0; });
    var pwKeys = [];
    try { var pw = chartWidget._paneWidget; pwKeys = Object.keys(pw).filter(function(k) { return k.indexOf('ine') >= 0 || k.indexOf('raw') >= 0; }); } catch(e) {}

    return JSON.stringify({ cwLineKeys: cwKeys, pwLineKeys: pwKeys, drawActions: drawActs });
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
      });

      const result = JSON.parse(r.result.value);
      console.log(JSON.stringify(result, null, 2));
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
