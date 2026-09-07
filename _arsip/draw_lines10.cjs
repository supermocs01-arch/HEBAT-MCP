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

      // Explore entity collection and line tools
      const r = await send('Runtime.evaluate', {
        expression: `(function() {
  try {
    var api = window.TradingViewApi;
    var wv = api._activeChartWidgetWV.value();
    var chartWidget = wv._chartWidget;
    var model = chartWidget.model();
    var series = model.mainSeries();

    // Check for entityCollection or lineTools on the widget
    var wvKeys = Object.keys(wv);
    var ec = wvKeys.filter(function(k) { return k.indexOf('Entity')>=0 || k.indexOf('entity')>=0 || k.indexOf('Line')>=0 || k.indexOf('line')>=0; });

    // Check chartWidget
    var cwKeys = Object.keys(chartWidget);
    var relevant = cwKeys.filter(function(k) { return k.indexOf('Entity')>=0 || k.indexOf('entity')>=0 || k.indexOf('Add')>=0 || k.indexOf('add')>=0 || k.indexOf('create')>=0 || k.indexOf('Line')>=0 || k.indexOf('line')>=0; });

    // Try accessing line tools via actions
    var acts = chartWidget._actions || {};
    var drawActs = Object.keys(acts).filter(function(a) { return a.indexOf('horizontal')>=0 || a.indexOf('Horizontal')>=0; });

    // Look for HorizontalLine utility
    var chartModel = model._chartModel;
    var cmKeys = chartModel ? Object.keys(chartModel).filter(function(k) { return k.indexOf('ine')>=0 || k.indexOf('ineTool')>=0; }) : [];

    return JSON.stringify({
      wvEntityKeys: ec,
      cwKeys: relevant,
      drawActs: drawActs,
      cmKeys: cmKeys
    });
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
      });

      console.log(JSON.parse(r.result.value));
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
