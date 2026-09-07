// probe_tvapi.cjs - semua properti TradingViewApi + cari editor api
const http = require('http');
http.get('http://127.0.0.1:9222/json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    if (!t) { console.log('no chart'); process.exit(1); }
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) { return new Promise(r => { const mid = id++; const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); r(j.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); }); }
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      const r = await send('Runtime.evaluate', {
        expression: `JSON.stringify((function(){
          var out = {apiKeys: []};
          try {
            var api = window.TradingViewApi;
            var keys = Object.keys(api);
            out.apiKeys = keys;
            for (var i=0;i<keys.length;i++) {
              var k = keys[i];
              var v = api[k];
              if (k.toLowerCase().indexOf('pine') >= 0 || k.toLowerCase().indexOf('editor') >= 0 || k.toLowerCase().indexOf('monaco') >= 0) {
                out.pineRelated = out.pineRelated || [];
                out.pineRelated.push({k: k, t: typeof v, hasValue: !!(v && typeof v.value === 'function'), hasKeys: v && typeof v === 'object' ? Object.keys(v).slice(0,10) : []});
              }
            }
          } catch(e) { out.err = e.message; }
          return out;
        })())`,
        returnByValue: true
      });
      console.log(r.result && r.result.value ? r.result.value : JSON.stringify(r.result));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));