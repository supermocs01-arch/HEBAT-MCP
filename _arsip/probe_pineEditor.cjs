// probe_pineEditor.cjs - isi window.TradingViewApi.pineEditor
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
          var out = {keys: [], methods: [], subKeys: []};
          try {
            var pe = window.TradingViewApi.pineEditor;
            var keys = Object.keys(pe);
            out.keys = keys;
            for (var i=0;i<keys.length;i++) {
              var k = keys[i];
              var v = pe[k];
              if (typeof v === 'function') out.methods.push(k);
              else if (v && typeof v === 'object') out.subKeys.push({k: k, keys: Object.keys(v).slice(0,20), t: typeof v});
            }
            // cek _pineEditorApi & _pineEditorTestApi juga
            for (var nm of ['_pineEditorApi','_pineEditorTestApi']) {
              var a = window.TradingViewApi[nm];
              out[nm] = a ? Object.keys(a).slice(0,40) : null;
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