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
    var lds = wv._lineDataSources;

    if (!lds) return JSON.stringify({err: 'no lineDataSources'});
    var keys = Object.keys(lds);
    var methods = keys.filter(function(k) { return typeof lds[k] === 'function'; });
    var createMethods = methods.filter(function(m) { return m.indexOf('add')>=0||m.indexOf('cre')>=0||m.indexOf('Add')>=0; });

    // Try to get an instance of the HorizontalLine class
    // TradingView has HorizontalLine in the source
    var HL = window.TradingView ? window.TradingView.HorizontalLine : null;
    if (!HL) {
      // Look in webpack modules
      var webpack = window.webpackChunktradingview;
      if (webpack) {
        var modules = webpack.push([[], {}, function(r) { return r; }]);
      }
    }

    return JSON.stringify({
      ldsType: typeof lds,
      isArray: Array.isArray(lds),
      keys: keys.slice(0, 30),
      methods: methods.slice(0, 20),
      createMethods: createMethods
    });
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
      });

      console.log(JSON.parse(r.result.value));
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
