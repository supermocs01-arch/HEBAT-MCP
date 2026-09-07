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
    var chartApi = api._chartApiInstance;

    // Check function signature
    var fn = chartApi.createStudy;
    var fnStr = fn.toString().substring(0, 500);
    var fnLen = fn.length;

    // List all methods on chartApi
    var allMethods = Object.keys(chartApi).filter(function(k) { return typeof chartApi[k] === 'function'; });

    return JSON.stringify({
      fnLength: fnLen,
      fnSource: fnStr.substring(0, 400),
      allMethods: allMethods.slice(0, 30)
    });
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
      });

      const result = JSON.parse(r.result.value);
      console.log(JSON.stringify(result, null, 2));

      // Try a different approach - through the chart widget's model directly
      const r2 = await send('Runtime.evaluate', {
        expression: `(function() {
  try {
    var api = window.TradingViewApi;
    var wv = api._activeChartWidgetWV.value();
    var chartWidget = wv._chartWidget;
    var model = chartWidget.model();

    // Look at all studies on the chart
    var studies = [];
    try {
      var ss = model.allStudies();
      if (ss && ss.forEach) {
        ss.forEach(function(s) {
          studies.push({name: s.name ? s.name() : '?', id: s.id ? s.id() : '?'});
        });
      }
    } catch(e) {}

    // Try to add a "Horizontal Line" or "Price Line" via the widget chart API
    // TradingView Desktop might use a different API
    // Check if window has __TRADINGVIEW_WIDGET__
    var hasWidget = !!window.__TRADINGVIEW_WIDGET__;

    return JSON.stringify({studiesCount: studies.length, studies: studies.slice(0,10), hasWidget: hasWidget});
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
      });

      console.log(JSON.parse(r2.result.value));

      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
