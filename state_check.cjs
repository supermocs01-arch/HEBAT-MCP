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
            var wv = window.TradingViewApi._activeChartWidgetWV.value();
            var cw = wv._chartWidget;
            var mm = cw.model().m_model;
            var bb = cw.model().mainSeries().bars();
            var p = mm._properties;
            var cs = p.mainSeriesProperties.candleStyle;
            return JSON.stringify({
              sym: wv.symbol(),
              res: wv.resolution(),
              mainBars: bb.size(),
              loading: cw._inLoadingState,
              initialLoading: cw._initialLoading,
              up: cs.upColor._value, dn: cs.downColor._value,
              bu: cs.borderUpColor._value, bd: cs.borderDownColor._value,
              bg: p.paneProperties.background._value
            });
          } catch(e) { return 'ERR:' + e.message; }
        })()`,
        returnByValue: true
      });
      console.log(r.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });