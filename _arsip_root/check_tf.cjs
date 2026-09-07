const http = require('http');
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const targets = JSON.parse(d);
    const chart = targets.find(t => t.url && t.url.includes('/chart/') && !t.url.includes('doubleclick') && !t.url.includes('google'));
    if (!chart) { console.log('Chart not found'); process.exit(1); }
    const WebSocket = require('ws');
    const ws = new WebSocket(chart.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) { return new Promise(r => { const msgId = id++; const h = (raw) => { const resp = JSON.parse(raw.toString()); if (resp.id === msgId) { ws.removeListener('message', h); r(resp.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: msgId, method: m, params: p || {} })); }); }
    ws.on('open', async () => {
      await send('Page.enable');
      await send('Runtime.enable');
      
      const r = await send('Runtime.evaluate', { expression: `(function(){
        try {
          var api = window.TradingViewApi;
          var wv = api._activeChartWidgetWV.value();
          var cw = wv._chartWidget;

          // Check for setResolution on chart widget
          if (cw.setResolution) return 'cw.setResolution exists: ' + cw.setResolution.length + ' params';
          if (cw.changeTimeFrame) return 'cw.changeTimeFrame exists: ' + cw.changeTimeFrame.length + ' params';
          if (cw.setTimeFrame) return 'cw.setTimeFrame exists: ' + cw.setTimeFrame.length + ' params';

          // Check active chart properties for resolution
          var cp = cw.chartPropertiesModel || cw._chartPropertiesModel;
          if (cp) {
            var keys = Object.keys(cp).filter(function(k) { return typeof cp[k] === 'function'; });
            return 'cp fns: ' + keys.join(',');
          }

          // Try through model
          var model = cw.model();
          // Check if there's a chart widget collection
          var col = api._chartWidgetCollection;
          if (col && col.size > 0) {
            var first = col.valueAt ? col.valueAt(0) : col[0];
            if (first && first.chart) {
              var chartApi = first.chart();
              var chartKeys = Object.getOwnPropertyNames(chartApi).filter(function(k) { return typeof chartApi[k] === 'function'; });
              return 'chartApi fns: ' + chartKeys.join(',');
            }
          }

          // Try standard TradingView API methods
          if (window.tvWidget) {
            if (window.tvWidget.chart && window.tvWidget.chart().setResolution) {
              return 'tvWidget.setResolution exists';
            }
            return 'tvWidget exists but no setResolution';
          }

          // Check if __widgets exists (some TradingView builds store here)
          if (window.__widgets && window.__widgets.length) {
            var w = window.__widgets[0];
            if (w.chart) {
              if (w.chart().setResolution) return '__widgets chart.setResolution exists';
              return '__widgets chart exists';
            }
          }

          return JSON.stringify(Object.keys(cw).slice(0,30));
        } catch(e) { return 'err: ' + e.message; }
      })()` });
      console.log(r.result.value);
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
