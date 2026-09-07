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
            var sts = wv._chartWidget._studies || {};
            var keys = Object.keys(sts);
            if (!keys.length) return 'no studies';
            var st = sts[keys[0]];
            var out = { stKeys: Object.keys(st).slice(0,40), dataKeys: null, paneLabelViews: [] };
            if (st._data) out.dataKeys = Object.keys(st._data);
            var pvs = st._paneViews || [];
            pvs.forEach(function(v, i){
              var k = Object.keys(v);
              if (/label/i.test(JSON.stringify(k)) || k.some(function(x){ return /label/i.test(x); })) {
                out.paneLabelViews.push(i + ':' + k.join(','));
              }
            });
            return JSON.stringify(out);
          } catch(e) { return 'ERR:' + e.message; }
        })()`,
        returnByValue: true
      });
      console.log(r.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });