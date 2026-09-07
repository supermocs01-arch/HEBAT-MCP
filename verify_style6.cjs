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
            var cs = ms._properties.candleStyle;
            var pv = cs.upColor;
            var k1 = [];
            for (var p in pv) k1.push(p);
            out.pvKeys = k1;
            var proto = Object.getPrototypeOf(pv);
            out.pvProto = Object.getOwnPropertyNames(proto);
            var pr = ms._properties;
            out.propsProto = Object.getOwnPropertyNames(Object.getPrototypeOf(pr));
            var sc = cs._schema;
            out.schema = sc ? (typeof sc === 'object' ? Object.keys(sc) : String(sc)) : 'none';
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