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

    if (!series) return JSON.stringify({err: 'no series'});
    if (!series.createPriceLine) return JSON.stringify({err: 'no createPriceLine method', keys: Object.keys(series).filter(function(k){return k.indexOf('Price')>=0||k.indexOf('price')>=0||k.indexOf('Line')>=0})});

    var lines = [
      {price: 4030, color: '#00BFFF', lineStyle: 0, lineWidth: 2, title: 'ENTRY 4030'},
      {price: 4020, color: '#FF6347', lineStyle: 2, lineWidth: 1, title: 'SL 4020'},
      {price: 4040, color: '#00FF00', lineStyle: 0, lineWidth: 1, title: 'TP1 4040'},
      {price: 4070, color: '#008080', lineStyle: 2, lineWidth: 1, title: 'TP2 4070'}
    ];

    var results = [];
    lines.forEach(function(l) {
      try {
        var pl = series.createPriceLine({
          price: l.price,
          color: l.color,
          lineStyle: l.lineStyle,
          lineWidth: l.lineWidth,
          axisLabelVisible: true,
          title: l.title
        });
        results.push({price: l.price, ok: true, type: typeof pl});
      } catch(e) {
        results.push({price: l.price, err: e.message});
      }
    });

    return JSON.stringify({success: true, results: results});
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
      });

      console.log(JSON.parse(r.result.value));
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
