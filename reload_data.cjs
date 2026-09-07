const http = require('http');
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p) => new Promise(r => { const mid = id++; const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); r(j.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); });
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    ws.on('open', async () => {
      await send('Runtime.enable');
      const r = await send('Runtime.evaluate', {
        expression: `(function(){
          try {
            var cw = window.TradingViewApi._activeChartWidgetWV.value()._chartWidget;
            var m = cw.model();
            var out = { methods: [] };
            if (typeof m.reloadAll === 'function') { m.reloadAll(); out.methods.push('reloadAll'); }
            return JSON.stringify(out);
          } catch(e) { return 'ERR:' + e.message; }
        })()`,
        returnByValue: true
      });
      console.log(r.result.value);
      await sleep(15000);
      const r2 = await send('Runtime.evaluate', {
        expression: `(function(){
          var cw = window.TradingViewApi._activeChartWidgetWV.value()._chartWidget;
          var ms = cw.model().m_model;
          var bb = ms.bars();
          return JSON.stringify({
            mainBars: bb.size(),
            loading: cw._inLoadingState,
            initialLoading: cw._initialLoading,
            containsData: cw._containsData,
            seriesStatus: ms._status._value
          });
        })()`,
        returnByValue: true
      });
      console.log('AFTER:', r2.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });