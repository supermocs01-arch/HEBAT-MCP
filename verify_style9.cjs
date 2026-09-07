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
            var cs = cw._mainSeriesProperties.candleStyle;
            var th = cs._themedColors;
            out.thType = typeof th;
            if (th) {
              var k1 = []; for (var p in th) k1.push(p);
              out.thKeys = k1.slice(0,40);
              var tc = th.candleStyle || th;
              out.tcKeys = tc ? Object.keys(tc) : 'none';
              if (tc) {
                out.thVals = {};
                ['upColor','downColor','borderColor','borderUpColor','borderDownColor','wickUpColor','wickDownColor'].forEach(function(kk){
                  try { var v = tc[kk]; out.thVals[kk] = (v && '_value' in v) ? String(v._value) : (typeof v === 'string' ? v : '?'); } catch(e){}
                });
              }
            }
            var theme = cs._theme;
            out.theme = theme ? JSON.stringify(theme).slice(0,200) : 'none';
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