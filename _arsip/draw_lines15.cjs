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

      // Find the public API through various methods
      const r = await send('Runtime.evaluate', {
        expression: `(function() {
  try {
    var api = window.TradingViewApi;
    var wv = api._activeChartWidgetWV.value();
    var chartWidget = wv._chartWidget;
    var model = chartWidget.model();

    // Try to find chart() on the api or widget
    var info = {};

    // Check TradingViewApi methods
    info.apiKeys = Object.keys(api).filter(function(k) { return k.indexOf('chart')>=0||k.indexOf('Chart')>=0||k.indexOf('widget')>=0||k.indexOf('Widget')>=0; });

    // Try chartWidget._chartModel
    var cm = chartWidget._chartModel;
    if (cm) {
      info.hasChartModel = true;
      var cmKeys = Object.keys(cm);
      info.createMethods = cmKeys.filter(function(k) { return k.indexOf('create')>=0||k.indexOf('add')>=0; });
    }

    // Try the TradingView global's getWidget
    if (window.TradingView && window.TradingView._getWidget) {
      info.hasGetWidget = true;
    }

    // Try using internal pubsub/channel
    var wvKeys = Object.keys(wv);
    info.pubsubKeys = wvKeys.filter(function(k) { return k.indexOf('post')>=0||k.indexOf('message')>=0||k.indexOf('emit')>=0||k.indexOf('send')>=0; });

    return JSON.stringify(info);
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
      });

      const result = JSON.parse(r.result.value);
      console.log(JSON.stringify(result, null, 2));

      if (!result.err) {
        // Now try creating lines through chartModel.addEntity or similar
        const r2 = await send('Runtime.evaluate', {
          expression: `(function() {
  try {
    var api = window.TradingViewApi;
    var wv = api._activeChartWidgetWV.value();
    var chartWidget = wv._chartWidget;

    // Try getChart or public API through widget
    // The wv wrapper might have a chart() method
    if (typeof wv.chart === 'function') {
      var c = wv.chart();
      if (c && c.createStudy) {
        c.createStudy('Horizontal Line', false, false, {price: 4030, text: 'ENTRY'});
        return JSON.stringify({method: 'wv.chart().createStudy', ok: true});
      }
    }

    // Try accessing through chartWidget.getApi or similar
    var keys = Object.keys(chartWidget);
    var apiMethods = keys.filter(function(k) { return k.indexOf('Api')>=0||k.indexOf('api')>=0||k.indexOf('Public')>=0||k.indexOf('public')>=0||k.indexOf('get')>=0; });

    return JSON.stringify({apiMethods: apiMethods});
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
        });
        console.log(JSON.parse(r2.result.value));
      }

      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
