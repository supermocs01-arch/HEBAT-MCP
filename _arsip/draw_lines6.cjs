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

      // Method 1: series.createPriceLine (syntax yang benar)
      const r1 = await send('Runtime.evaluate', {
        expression: `(function() {
  try {
    var api = window.TradingViewApi;
    var wv = api._activeChartWidgetWV.value();
    var chartWidget = wv._chartWidget;
    var model = chartWidget.model();
    var series = model.mainSeries();

    // Remove old shapes first
    var entities = wv._lineDataSources;
    if (entities) {
      var toRemove = [];
      for (var i = 0; i < entities.size(); i++) {
        var e = entities.valueAt(i);
        if (e) {
          var t = e.title ? e.title() : '';
          if (t.indexOf('ENTRY') >= 0 || t.indexOf('SL ') >= 0 || t.indexOf('TP1') >= 0 || t.indexOf('TP2') >= 0) {
            toRemove.push(e);
          }
        }
      }
      toRemove.forEach(function(e) { try { wv.removeEntity(e); } catch(ex) {} });
    }

    // Use createPriceLine on the series
    var lines = [
      {price: 4030, color: '#00BFFF', style: 0, width: 2, title: 'ENTRY 4030'},
      {price: 4020, color: '#FF6347', style: 2, width: 1, title: 'SL 4020'},
      {price: 4040, color: '#00FF00', style: 0, width: 1, title: 'TP1 4040'},
      {price: 4070, color: '#008080', style: 2, width: 1, title: 'TP2 4070'}
    ];

    var results = [];
    lines.forEach(function(l) {
      try {
        var pl = series.createPriceLine({
          price: l.price,
          color: l.color,
          lineStyle: l.style,
          lineWidth: l.width,
          axisLabelVisible: true,
          title: l.title
        });
        results.push({price: l.price, ok: !!pl});
      } catch(e) {
        results.push({price: l.price, err: e.message});
      }
    });

    return JSON.stringify({method: 'createPriceLine', results: results});
  } catch(e) { return JSON.stringify({err: e.message, stack: e.stack.substring(0,300)}); }
})()`
      });

      const result1 = JSON.parse(r1.result.value);
      console.log('Method 1:', JSON.stringify(result1));

      if (result1.err || (result1.results && result1.results.some(function(r){return r.err}))) {
        // Method 2: Try different approach through the pane widget
        console.log('Trying method 2...');
        const r2 = await send('Runtime.evaluate', {
          expression: `(function() {
  try {
    var api = window.TradingViewApi;
    var wv = api._activeChartWidgetWV.value();
    var chartWidget = wv._chartWidget;
    var model = chartWidget.model();
    
    // Get the pane
    var paneManager = chartWidget.paneManager();
    var panes = paneManager.allPanes();
    var pane = panes[0];

    // Get pane widget
    var pw = chartWidget._paneWidget;
    
    // Try using the entity collection
    var ec = wv._entityCollection;
    if (ec) {
      var levels = [
        {price: 4030, text: 'ENTRY 4030', color: '#00BFFF'},
        {price: 4020, text: 'SL 4020', color: '#FF6347'},
        {price: 4040, text: 'TP1 4040', color: '#00FF00'},
        {price: 4070, text: 'TP2 4070', color: '#008080'}
      ];
      var res2 = [];
      levels.forEach(function(l) {
        try {
          var entity = ec.addEntity('horizontal_line', {
            points: [{price: l.price}],
            text: l.text,
            color: l.color
          });
          res2.push({price: l.price, ok: !!entity});
        } catch(e) {
          res2.push({price: l.price, err: e.message});
        }
      });
      return JSON.stringify({method: 'entityCollection', results: res2});
    }
    return JSON.stringify({err: 'no entity collection'});
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
        });
        console.log('Method 2:', JSON.parse(r2.result.value));
      }

      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
