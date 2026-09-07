const http = require('http');
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const targets = JSON.parse(d);
    const chart = targets.find(t => t.url && t.url.includes('/chart/'));
    if (!chart) { console.log('no chart'); process.exit(1); }
    const WebSocket = require('ws');
    const ws = new WebSocket(chart.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) {
      return new Promise(r => {
        const mid = id++;
        const h = raw => {
          const resp = JSON.parse(raw.toString());
          if (resp.id === mid) { ws.removeListener('message', h); r(resp.result); }
        };
        ws.on('message', h);
        ws.send(JSON.stringify({ id: mid, method: m, params: p || {} }));
      });
    }
    ws.on('open', async () => {
      await send('Page.enable');
      await send('Runtime.enable');
      const rr = await send('Runtime.evaluate', {
        expression: `(function(){
          var api = window.TradingViewApi;
          var wv = api._activeChartWidgetWV.value();
          var model = wv._chartWidget.model();
          var b = model.mainSeries().bars();
          var n = b.size();
          var s = Math.max(0, n - 40);
          var out = [];
          for (var i = s; i < n; i++) {
            var v = b.valueAt(i);
            if (v) out.push([v[1], v[2], v[3], v[4]]);
          }
          return JSON.stringify(out);
        })()`,
        returnByValue: true
      });
      const val = rr.result.value;
      const arr = JSON.parse(val);
      const O = arr.map(x => x[0]), H = arr.map(x => x[1]), L = arr.map(x => x[2]), C = arr.map(x => x[3]);
      console.log('Total bars:', arr.length);
      for (let i = 0; i < arr.length; i++) {
        console.log((i+1) + ': O:' + O[i].toFixed(2) + ' H:' + H[i].toFixed(2) + ' L:' + L[i].toFixed(2) + ' C:' + C[i].toFixed(2));
      }
      ws.close();
    });
  });
}).on('error', e => console.log(e.message));
