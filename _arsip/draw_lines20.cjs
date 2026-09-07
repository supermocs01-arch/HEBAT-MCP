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

      // Use _chartApiInstance with proper params 
      const r = await send('Runtime.evaluate', {
        expression: `(function() {
  try {
    var api = window.TradingViewApi;
    var chartApi = api._chartApiInstance;
    var chartWidget = api._activeChartWidgetWV.value()._chartWidget;
    var model = chartWidget.model();
    var series = model.mainSeries();

    // Method: Use createStudy with correct params (from source analysis)
    // Function signature: createStudy(e, t, s, n, i, o, a, r)
    // e = name, t = ? (counter?), s = forceOverlay, n = inputs, i = callback, o = ? , a = ? , r = options with id
    // Try with proper params
    var results = [];

    // Try adding "Horizontal Line" as a study via model (not chartApi)
    try {
      // model.createStudy might exist
      if (model.createStudy) {
        var sl = model.createStudy('Horizontal Line', false, true, {price: 4030});
        results.push({method: 'model.createStudy', ok: !!sl});
      } else if (model.addStudy) {
        var sl = model.addStudy('Horizontal Line', {price: 4030});
        results.push({method: 'model.addStudy', ok: !!sl});
      }
    } catch(e) { results.push({method: 'model', err: e.message.substring(0,80)}); }

    // Try via widget's executeActionById with inserting indicator
    try {
      chartWidget.executeActionById('insertIndicator', 'Horizontal Line');
      results.push({method: 'executeActionById insertIndicator', ok: true});
    } catch(e) { results.push({method: 'executeActionById', err: e.message.substring(0,80)}); }

    // Try using the chart widget's createStudy method 
    try {
      if (chartWidget.createStudy) {
        chartWidget.createStudy('Horizontal Line', false, false);
        results.push({method: 'chartWidget.createStudy', ok: true});
      }
    } catch(e) {}

    // Try using the built-in "Price Line" from the TradingView studies collection
    // Price Line is usually available as a chart study
    try {
      // Find the study manager
      var sm = model._studyManager;
      if (sm) {
        var smKeys = Object.keys(sm).filter(function(k) { return k.indexOf('create')>=0||k.indexOf('add')>=0; });
        results.push({method: 'studyManager', keys: smKeys});
      }
    } catch(e) {}

    // List all methods on model for creating entities
    var modelKeys = Object.keys(model).filter(function(k) { return k.indexOf('create')>=0||k.indexOf('add')>=0||k.indexOf('insert')>=0; });
    results.push({modelCreateKeys: modelKeys});

    // Check if we can use the chart widget's built-in line tools
    var cwKeys = Object.keys(chartWidget).filter(function(k) { return k.indexOf('Line')>=0||k.indexOf('line')>=0; });
    results.push({chartWidgetLineKeys: cwKeys});

    return JSON.stringify(results);
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
      });

      console.log(JSON.stringify(JSON.parse(r.result.value), null, 2));
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
