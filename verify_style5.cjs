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
            var pr = ms._properties;
            var cs = pr.candleStyle;
            out.csKeys = Object.keys(cs);
            out.csVals = {};
            ['upColor','downColor','borderColor','borderUpColor','borderDownColor','wickUpColor','wickDownColor'].forEach(function(k2){ if (k2 in cs) { try { var v = cs[k2]; out.csVals[k2] = (v && ('_value' in v)) ? String(v._value) : '?'; } catch(e3){ out.csVals[k2] = 'ERR'; } } });
            var mkeys = [];
            for (var k in pr) { if (typeof pr[k] === 'function') mkeys.push(k); }
            out.propMethods = mkeys.slice(0,30);
          } catch(e){ out.err = e.message; }
          return JSON.stringify(out);
        })()`,
        returnByValue: true
      });
      console.log('RAW:', JSON.stringify(r));
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });