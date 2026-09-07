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

      // Try the standard TradingView widget API approach
      // First, get the widget reference
      const r = await send('Runtime.evaluate', {
        expression: `(function() {
  try {
    var results = [];

    // Method A: Try TradingView._getWidget or similar
    var tv = window.TradingView;
    if (tv && tv._getWidget) {
      try {
        var widget = tv._getWidget(0);
        if (widget) {
          var chart = widget.chart();
          var shape = chart.createShape({time: Date.now()/1000, price: 4030}, {shape: 'horizontal_line'});
          results.push({method: 'widget.chart().createShape', ok: !!shape});
        }
      } catch(e) { results.push({method: 'widget', err: e.message}); }
    }

    // Method B: Try through TradingViewApi's widget collection
    var api = window.TradingViewApi;
    if (api._chartWidgetCollection) {
      try {
        var col = api._chartWidgetCollection;
        if (col.size && col.size() > 0) {
          var w = col.valueAt(0);
          if (w && w.chart) {
            var c = w.chart();
            var shape = c.createShape(
              {time: c.getVisibleRange().to, price: 4030},
              {shape: 'horizontal_line', text: 'ENTRY 4030', color: '#00BFFF'}
            );
            results.push({method: 'collection.chart().createShape', ok: !!shape});
          }
        }
      } catch(e) { results.push({method: 'collection', err: e.message}); }
    }

    // Method C: Use TradingViewApi directly for insertIndicator
    try {
      api._activateChart(0);
      results.push({method: 'activateChart', ok: true});
    } catch(e) {}

    // Method D: Try to use webpack modules to get HorizontalLine class
    var wb = window.webpackChunktradingview;
    if (wb && wb.push) {
      // Find a module that contains HorizontalLine
      var found = false;
      try {
        wb.push([["__test"], {}, function(r) {
          for (var key in r) {
            var m = r[key];
            if (m && m.toString && m.toString().indexOf('HorizontalLine') >= 0) {
              found = true;
              break;
            }
          }
        }]);
      } catch(e) {}
      results.push({method: 'webpack', found: found});
    }

    return JSON.stringify(results);
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
      });

      console.log(JSON.parse(r.result.value));
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
