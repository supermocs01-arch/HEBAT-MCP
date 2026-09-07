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

      // Use wv.createShape and force redraw
      const r = await send('Runtime.evaluate', {
        expression: `(function() {
  try {
    var api = window.TradingViewApi;
    var wv = api._activeChartWidgetWV.value();
    var chartWidget = wv._chartWidget;
    var model = chartWidget.model();

    // Get current time for points
    var bars = model.mainSeries().bars();
    var lastTime = null;
    for (var i = 0; i < bars.size(); i++) {
      var v = bars.valueAt(i);
      if (v) { lastTime = v[0]; }
    }
    if (!lastTime) lastTime = Date.now() / 1000;

    var timeFrom = lastTime - 3600 * 24 * 5; // 5 days ago
    var timeTo = lastTime + 3600 * 24 * 30;  // 30 days ahead

    var levels = [
      {price: 4030, color: '#00BFFF', text: 'ENTRY 4030'},
      {price: 4020, color: '#FF6347', text: 'SL 4020'},
      {price: 4040, color: '#00FF00', text: 'TP1 4040'},
      {price: 4070, color: '#008080', text: 'TP2 4070'}
    ];

    var results = [];
    levels.forEach(function(l) {
      try {
        var shape = wv.createShape('horizontal_line', {
          points: [{time: timeFrom, price: l.price}, {time: timeTo, price: l.price}],
          text: l.text,
          color: l.color,
          linewidth: 2,
          lock: true
        });
        results.push({price: l.price, ok: !!shape});
      } catch(e) {
        results.push({price: l.price, err: e.message.substring(0,100)});
      }
    });

    // Force chart to redraw
    chartWidget._drawRafId = null;
    chartWidget._drawPlanned = false;
    try { chartWidget.redraw(); } catch(e) {}
    try { chartWidget._redraw(); } catch(e) {}

    return JSON.stringify({success: true, results: results});
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
      });

      console.log(JSON.parse(r.result.value));
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
