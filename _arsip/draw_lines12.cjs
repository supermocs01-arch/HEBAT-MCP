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

      // Method: Use chart model's entity creation through internal API
      const r = await send('Runtime.evaluate', {
        expression: `(function() {
  try {
    var api = window.TradingViewApi;
    var wv = api._activeChartWidgetWV.value();
    var chartWidget = wv._chartWidget;
    var model = chartWidget.model();

    // Try creating a study/indicator for the horizontal line
    // TradingView has built-in studies like "Horizontal Line"
    var studies = model.allStudies ? model.allStudies() : [];
    if (typeof studies !== 'object') studies = [];

    // Try to create a "Horizontal Line" study
    try {
      var result = model.createStudy('Horizontal Line', false, false, {
        price: 4030
      });
      return JSON.stringify({method: 'createStudy', ok: !!result});
    } catch(e) {
      return JSON.stringify({method: 'createStudy', err: e.message});
    }
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
      });

      console.log(JSON.parse(r.result.value));
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
