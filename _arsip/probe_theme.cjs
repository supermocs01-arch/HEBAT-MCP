const http = require('http');
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p) => new Promise(r => { const mid = id++; const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); r(j.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); });
    ws.on('open', async () => {
      await send('Runtime.enable');
      const r = await send('Runtime.evaluate', {
        expression: `(function(){
          try {
            var cw = window.TradingViewApi._activeChartWidgetWV.value()._chartWidget;
            var modelKeys = Object.keys(cw.model());
            var themeKeys = [];
            modelKeys.forEach(function(k){ if (/theme|override|style|color/i.test(k)) themeKeys.push(k); });
            var out = { themeKeys: themeKeys };
            if (cw.model()._themeStyles) {
              var ts = cw.model()._themeStyles;
              out.tsKeys = Object.keys(ts);
              if (ts.candleStyle) out.candle = JSON.stringify(ts.candleStyle);
            }
            return JSON.stringify(out);
          } catch(e) { return 'ERR:' + e.message; }
        })()`,
        returnByValue: true
      });
      console.log(r.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });