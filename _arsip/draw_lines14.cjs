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

      // Create a shape and inspect its properties
      const r = await send('Runtime.evaluate', {
        expression: `(function() {
  try {
    var api = window.TradingViewApi;
    var wv = api._activeChartWidgetWV.value();
    var chartWidget = wv._chartWidget;

    // Create one shape and get its properties
    var time = Date.now() / 1000;
    var shape = wv.createShape('horizontal_line', {
      points: [{time: time - 86400*2, price: 4030}, {time: time + 86400*30, price: 4030}],
      text: 'ENTRY 4030',
      color: '#00BFFF',
      linewidth: 2,
      lock: true
    });

    if (!shape) return JSON.stringify({err: 'shape creation returned null'});

    // Get shape properties
    var info = { hasShape: true, type: typeof shape };
    if (shape.properties) {
      var props = shape.properties();
      info.properties = Object.keys(props).reduce(function(o,k){o[k]=props[k];return o;}, {});
    }
    if (shape.id) info.id = shape.id;
    if (shape.points) { info.points = shape.points(); }

    // Check if it's in the entity collection
    var lds = wv._lineDataSources;
    if (lds) {
      var count = 0;
      if (typeof lds.size === 'function') { count = lds.size(); }
      else { count = Object.keys(lds).length; }
      info.ldsCount = count;
      info.ldsHasShape = shape.id && lds[shape.id] ? true : false;
    }

    // Try to check chart's entity state
    var entities = chartWidget._entities;
    if (entities) info.hasEntities = true;

    return JSON.stringify(info);
  } catch(e) { return JSON.stringify({err: e.message, stack: e.stack.substring(0,200)}); }
})()`
      });

      const result = JSON.parse(r.result.value);
      console.log(JSON.stringify(result, null, 2));

      // Now try to check all entities on the chart
      const r2 = await send('Runtime.evaluate', {
        expression: `(function() {
  try {
    var api = window.TradingViewApi;
    var wv = api._activeChartWidgetWV.value();
    var chartWidget = wv._chartWidget;

    // List all entity-related properties
    var allKeys = Object.keys(chartWidget).concat(Object.keys(wv));
    var entityKeys = allKeys.filter(function(k,i,a) { return a.indexOf(k)===i && (k.indexOf('ntity')>=0||k.indexOf('shape')>=0||k.indexOf('Shape')>=0); });
    return JSON.stringify({entityKeys: entityKeys});
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
      });

      console.log(JSON.parse(r2.result.value));

      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
