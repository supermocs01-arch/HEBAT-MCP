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

      const r = await send('Runtime.evaluate', {
        expression: `(function() {
  try {
    var api = window.TradingViewApi;
    var wv = api._activeChartWidgetWV.value();
    var chartWidget = wv._chartWidget;
    var model = chartWidget.model();
    var series = model.mainSeries();

    var levels = [
      { price: 4030, color: '#00BFFF', text: 'ENTRY 4030', width: 2 },
      { price: 4010, color: '#FF6347', text: 'SL 4010', width: 1 },
      { price: 4050, color: '#00FF00', text: 'TP1 4050', width: 1 },
      { price: 4110, color: '#008080', text: 'TP2 4110', width: 1 }
    ];

    var results = [];
    levels.forEach(function(l) {
      try {
        // Try createShape on the widget wrapper
        if (wv.createShape) {
          var shape = wv.createShape('horizontal_line', {
            text: l.text,
            points: [{price: l.price}],
            color: l.color,
            linewidth: l.width,
            lock: true
          });
          results.push({price: l.price, created: !!shape});
        } else {
          results.push({price: l.price, err: 'createShape not available'});
        }
      } catch(e) {
        results.push({price: l.price, err: e.message.substring(0,100)});
      }
    });

    return JSON.stringify({success: true, results: results});
  } catch(e) { return JSON.stringify({err: e.message, stack: e.stack.substring(0,200)}); }
})()`
      });

      const result = JSON.parse(r.result.value);
      console.log(JSON.stringify(result, null, 2));

      if (result.err) {
        // Fallback: try creating studies (price lines) instead
        console.log('Trying fallback method...');
        const r2 = await send('Runtime.evaluate', {
          expression: `(function() {
  try {
    var api = window.TradingViewApi;
    var wv = api._activeChartWidgetWV.value();
    var chartWidget = wv._chartWidget;
    var model = chartWidget.model();
    var series = model.mainSeries();

    // Use series.createPriceLine or setPriceLine
    var levels = [4030, 4010, 4050, 4110];
    series.createPriceLine({price: 4030, color: '#00BFFF', lineStyle: 0, lineWidth: 2, axisLabelVisible: true, title: 'ENTRY 4030'});
    series.createPriceLine({price: 4010, color: '#FF6347', lineStyle: 2, lineWidth: 1, axisLabelVisible: true, title: 'SL 4010'});
    series.createPriceLine({price: 4050, color: '#00FF00', lineStyle: 0, lineWidth: 1, axisLabelVisible: true, title: 'TP1 4050'});
    series.createPriceLine({price: 4110, color: '#008080', lineStyle: 2, lineWidth: 1, axisLabelVisible: true, title: 'TP2 4110'});
    return JSON.stringify({success: true, method: 'createPriceLine'});
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
        });
        console.log(JSON.parse(r2.result.value));
      }

      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
