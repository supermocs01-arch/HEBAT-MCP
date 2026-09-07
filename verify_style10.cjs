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
            var mm = window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.model().m_model;
            var ms = mm.mainSeries();
            var so = ms._styleObject;
            out.soType = typeof so;
            if (so) {
              var k1 = []; for (var p in so) k1.push(p);
              out.soKeys = k1;
              out.vals = {};
              ['_colorUp','_colorDown','_borderColor','_wickColor','upColor','downColor','borderColor','wickColor'].forEach(function(kk){
                try { var v = so[kk]; out.vals[kk] = (typeof v === 'object') ? 'obj' : String(v); } catch(e){}
              });
            }
            var st = ms._style;
            out.styleType = typeof st;
            if (st && typeof st === 'object') {
              var k2 = []; for (var p2 in st) k2.push(p2);
              out.styleKeys = k2.slice(0,30);
              var so2 = st._styleObject;
              out.styleSO = so2 ? Object.keys(so2) : 'none';
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