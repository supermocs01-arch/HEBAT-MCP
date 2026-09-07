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
            var st = wv.getStudyById('PTdIuB');
            var src = st._study;
            if (!src) return 'no _study';
            var out = {};
            var mi = src._originalMetaInfo || src._metaInfo;
            if (mi && mi.inputs) {
              out.inputs = mi.inputs.map(function(i){ return { id: i.id, name: i.name, type: i.type, defval: i.defval }; });
            } else {
              out.metaKeys = Object.keys(mi || {});
            }
            if (src._properties) { out.propsKeys = Object.keys(src._properties); out.setFn = typeof src._properties.setInputValue; }
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