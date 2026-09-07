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
          var out = {};
          try {
            var cw = window.TradingViewApi._activeChartWidgetWV.value()._chartWidget;
            var keys = ['_mainSeriesProperties','_properties'];
            keys.forEach(function(k){
              var o = cw[k];
              out[k] = 'none';
              if (o) {
                var m = [];
                for (var p in o) m.push(p);
                out[k] = m.slice(0,50);
              }
            });
            var cso = cw._mainSeriesProperties;
            if (cso && cso.candleStyle) {
              var cs = cso.candleStyle;
              out.candleKeys = Object.keys(cs);
              out.candleVals = {};
              ['upColor','downColor','borderColor','borderUpColor','borderDownColor','wickUpColor','wickDownColor'].forEach(function(kk){
                try { var pv = cs[kk]; out.candleVals[kk] = pv && ('_value' in pv) ? String(pv._value) : '?'; } catch(e){}
              });
            }
          } catch(e){ out.err = e.message; }
          return JSON.stringify(out);
        })()`,
        returnByValue: true
      });
      console.log(r.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });