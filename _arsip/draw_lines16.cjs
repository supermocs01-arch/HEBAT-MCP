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
    if (!chartApi) return JSON.stringify({err: 'no _chartApiInstance'});

    var info = {
      type: typeof chartApi,
      keys: Object.keys(chartApi).filter(function(k) { return k.indexOf('create')>=0||k.indexOf('add')>=0||k.indexOf('shape')>=0||k.indexOf('Line')>=0||k.indexOf('line')>=0||k.indexOf('Study')>=0||k.indexOf('study')>=0||k.indexOf('Series')>=0; })
    };

    // Try chartApi.createStudy or createShape
    if (chartApi.createStudy) {
      return JSON.stringify(Object.assign(info, {hasCreateStudy: true}));
    }

    // Try through the public API
    if (chartApi.chart) {
      var c = chartApi.chart();
      if (c) {
        info.hasChart = true;
        info.chartKeys = Object.keys(c).filter(function(k) { return k.indexOf('create')>=0||k.indexOf('add')>=0||k.indexOf('Shape')>=0||k.indexOf('Line')>=0; });
      }
    }

    return JSON.stringify(info);
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
      });

      const result = JSON.parse(r.result.value);
      console.log(JSON.stringify(result, null, 2));

      if (result.keys && result.keys.length > 0) {
        // Try using the chart API to create shapes
        const r2 = await send('Runtime.evaluate', {
          expression: `(function() {
  try {
    var api = window.TradingViewApi;
    var chartApi = api._chartApiInstance;

    var levels = [
      {price: 4030, text: 'ENTRY 4030', color: '#00BFFF'},
      {price: 4020, text: 'SL 4020', color: '#FF6347'},
      {price: 4040, text: 'TP1 4040', color: '#00FF00'},
      {price: 4070, text: 'TP2 4070', color: '#008080'}
    ];

    var results = [];
    levels.forEach(function(l) {
      try {
        if (chartApi.createStudy) {
          var s = chartApi.createStudy('Horizontal Line', false, true, {
            price: l.price,
            text: l.text,
            color: l.color
          });
          results.push({price: l.price, ok: !!s});
        } else if (chartApi.createShape) {
          var s = chartApi.createShape('horizontal_line', {
            points: [{price: l.price}],
            text: l.text,
            color: l.color
          });
          results.push({price: l.price, ok: !!s});
        } else {
          results.push({price: l.price, err: 'no create method'});
        }
      } catch(e) {
        results.push({price: l.price, err: e.message.substring(0,100)});
      }
    });

    return JSON.stringify({method: 'chartApi', results: results});
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
        });
        console.log(JSON.parse(r2.result.value));
      }

      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
