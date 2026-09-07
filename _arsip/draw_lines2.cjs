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

      // Try to draw lines using the activeChart API (higher level)
      const r = await send('Runtime.evaluate', {
        expression: `(function() {
  try {
    var wv = window.TradingViewApi._activeChartWidgetWV.value();
    var chartWidget = wv._chartWidget;
    var activeChart = chartWidget.activeChart();
    
    if (activeChart && activeChart.createShape) {
      var levels = [
        { price: 4030, text: 'ENTRY 4030', color: '#00BFFF' },
        { price: 4010, text: 'SL 4010', color: '#FF6347' },
        { price: 4050, text: 'TP1 4050', color: '#00FF00' },
        { price: 4110, text: 'TP2 4110', color: '#008080' }
      ];
      var results = [];
      levels.forEach(function(l) {
        try {
          var shape = activeChart.createShape(
            { time: activeChart.getVisibleRange().to, price: l.price },
            { shape: 'horizontal_line', text: l.text, color: l.color, lock: true, disableSave: true }
          );
          results.push({price: l.price, shape: !!shape});
        } catch(e) {
          results.push({price: l.price, err: e.message});
        }
      });
      return JSON.stringify({success: true, results: results});
    }

    // Try another method - entityCollection
    var entityCollection = chartWidget._entityCollection;
    if (entityCollection && entityCollection.addEntity) {
      return JSON.stringify({hasCollection: true, methods: Object.keys(entityCollection).filter(function(k){return k.indexOf('add')>=0||k.indexOf('cre')>=0})});
    }

    // Try through main series pane
    var panes = chartWidget.paneManager().allPanes();
    var pane = panes[0];
    var paneKeys = Object.keys(pane).filter(function(k){return k.indexOf('add')>=0||k.indexOf('cre')>=0||k.indexOf('Line')>=0||k.indexOf('Shape')>=0;});
    
    // Try to find HorizontalLine through widget entity builder
    var entityBuilder = chartWidget._entityBuilder;
    
    return JSON.stringify({
      hasActiveChart: !!activeChart,
      activeChartKeys: activeChart ? Object.keys(activeChart).filter(function(k){return k.indexOf('Shape')>=0||k.indexOf('Line')>=0||k.indexOf('raw')>=0||k.indexOf('create')>=0||k.indexOf('add')>=0;}) : [],
      paneKeys: paneKeys,
      hasEntityBuilder: !!entityBuilder,
      hasEntityCollection: !!entityCollection
    });
  } catch(e) { return JSON.stringify({err: e.message, stack: e.stack.substring(0,300)}); }
})()`
      });

      const result = JSON.parse(r.result.value);
      console.log(JSON.stringify(result, null, 2));
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
