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
            out.hasColorerCache = !!ms._barColorerCache;
            if (ms._barColorerCache) {
              var bcArr = ms._barColorerCache._backColorers;
              out.bcCount = bcArr ? bcArr.length : 0;
              if (bcArr && bcArr.length) {
                var first = bcArr[0];
                var k1 = []; for (var p in first) k1.push(p);
                out.bcKeys = k1.slice(0,30);
                var so = first._styleObject;
                out.bcSO = so ? Object.keys(so) : 'none';
                out.bcVals = {};
                if (so) { ['upColor','downColor','borderColor','borderUpColor','borderDownColor','wickUpColor','wickDownColor'].forEach(function(kk){ try { out.bcVals[kk] = so[kk]; } catch(e){} }); }
              }
            }
            var pv = ms._paneView;
            out.hasPaneView = !!pv;
            if (pv) {
              var k3 = []; for (var p3 in pv) k3.push(p3); out.paneViewKeys = k3.slice(0,30);
              var barsArr = pv._bars;
              out.barsLen = barsArr ? barsArr.length : 0;
              if (barsArr && barsArr.length) {
                var b0 = barsArr[barsArr.length-1];
                var k4 = []; for (var p4 in b0) k4.push(p4);
                out.barKeys = k4;
                ['upColor','downColor','borderColor','borderUpColor','borderDownColor','wickUpColor','wickDownColor','color','_style'].forEach(function(kk){ try { out['bar_'+kk] = String(b0[kk]); } catch(e){} });
              }
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