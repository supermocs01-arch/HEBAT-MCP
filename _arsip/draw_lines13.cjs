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

    // Set line tool to horizontal line mode and place via mouse clicks
    // First, execute the drawing toolbar action
    if (chartWidget.executeActionById) {
      // Try to activate horizontal line drawing
      chartWidget.executeActionById('drawingToolbarAction');
    }

    // Alternative: access drawing tools directly
    // TradingView stores drawing tools in internal state
    var dt = chartWidget._drawingToolbar;
    if (dt) {
      dt.activateTool('horizontal_line');
    }

    // Check the chartWidget for drawing-related methods
    var cwKeys = Object.keys(chartWidget);
    var drawKeys = cwKeys.filter(function(k) { return k.indexOf('Draw')>=0 || k.indexOf('draw')>=0; });

    // Try to use wv.invokeAction or similar
    var wvKeys = Object.keys(wv);
    var invokeKeys = wvKeys.filter(function(k) { return k.indexOf('action')>=0||k.indexOf('Action')>=0||k.indexOf('invoke')>=0||k.indexOf('exec')>=0||k.indexOf('tool')>=0||k.indexOf('Tool')>=0; });

    return JSON.stringify({drawKeys: drawKeys, wvToolKeys: invokeKeys});
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
      });

      console.log(JSON.parse(r.result.value));
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
