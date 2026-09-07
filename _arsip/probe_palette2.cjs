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
            var cm = window.TradingViewApi._activeChartWidgetWV.value().chartModel();
            var found = [];
            Object.keys(cm).forEach(function(k){
              if (/color|pale/i.test(k)) found.push(k);
            });
            var extra = {};
            if (cm._paneColorizer) extra.pcKeys = Object.keys(cm._paneColorizer);
            if (cm._paneColorizer && cm._paneColorizer._palette) extra.palette = JSON.stringify(cm._paneColorizer._palette).slice(0,800);
            return JSON.stringify({ colorKeys: found, extra: extra });
          } catch(e) { return 'ERR:' + e.message; }
        })()`,
        returnByValue: true
      });
      console.log(r.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });