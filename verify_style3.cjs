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
          var out = {err:'none'};
          try {
            var wv = window.TradingViewApi._activeChartWidgetWV.value();
            out.sym = wv.symbol();
            var m = wv._chartWidget.model();
            var mm = m.m_model || m;
            out.hasMModel = !!m.m_model;
            var ms2 = mm.mainSeries();
            var st2 = ms2.style();
            out.style2Type = typeof st2;
            var so2 = st2._styleObject || st2;
            var a2 = []; for (var k3 in so2) a2.push(k3);
            out.so2Keys = a2.slice(0,60);
            out.bg = null;
            try { var bgv = mm._backgroundColor; out.bg = (bgv && bgv.get) ? bgv.get() : (bgv&&bgv.value?bgv.value():null); } catch(e2){ out.bg='err'; }
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