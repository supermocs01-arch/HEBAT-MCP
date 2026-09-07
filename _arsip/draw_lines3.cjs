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

      // Explore TradingViewApi to find the right way to draw lines
      const r = await send('Runtime.evaluate', {
        expression: `(function() {
  try {
    var api = window.TradingViewApi;
    var wv = api._activeChartWidgetWV.value();
    var info = {};

    // Get all keys from wv that might help
    var wvKeys = Object.keys(wv);
    info.wvMethods = wvKeys.filter(function(k) { return k.indexOf('create')>=0||k.indexOf('add')>=0||k.indexOf('draw')>=0||k.indexOf('line')>=0||k.indexOf('Line')>=0||k.indexOf('Study')>=0||k.indexOf('shape')>=0||k.indexOf('Shape')>=0||k.indexOf('Entity')>=0||k.indexOf('entity')>=0; });

    // Try wv API methods
    if (wv.createHorizontalLine) { info.createHorizontalLine = true; wv.createHorizontalLine({price:4030,color:'#00BFFF'}); }
    if (wv.createShape) { info.createShape = true; }
    if (wv.addLineTool) { info.addLineTool = true; }

    // Try to access through the API's chart method
    try {
      var chartAPI = wv.chart();
      if (chartAPI) {
        info.hasChartAPI = true;
        info.chartAPIMethods = Object.keys(chartAPI).filter(function(k) { return k.indexOf('create')>=0||k.indexOf('add')>=0||k.indexOf('Line')>=0||k.indexOf('Shape')>=0; });
        // Try creating a horizontal line
        try {
          var result = chartAPI.createHorizontalLine({price: 4030, text: 'ENTRY'});
          info.createResult = !!result;
        } catch(e) { info.createErr = e.message; }
        try {
          var result2 = chartAPI.createShape({time: Date.now(), price: 4030}, {shape: 'horizontal_line'});
          info.createShapeResult = !!result2;
        } catch(e) { info.createShapeErr = e.message; }
      }
    } catch(e) { info.chartAPIErr = e.message; }

    // Try TradingView object directly
    if (window.TradingView && window.TradingView.chart) {
      info.TVChart = true;
    }

    return JSON.stringify(info);
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
