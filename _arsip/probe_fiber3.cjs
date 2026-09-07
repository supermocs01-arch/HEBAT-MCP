// probe_fiber3.cjs - cari key fiber pola apapun (react$ / fiber)
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
          try {
            var c = document.querySelector(".monaco-editor.pine-editor-monaco");
            var el = c;
            var report = [];
            for (var i=0;i<30;i++){
              if (!el) break;
              var keys = Object.keys(el);
              var interesting = keys.filter(function(k){return /react|fiber|hooks|container|monaco|editor/i.test(k)});
              report.push({tag: el.tagName, cls:(el.className||'').toString().slice(0,30), keys: interesting.slice(0,10)});
              el = el.parentElement;
            }
            return {path: report};
          } catch(e){ return {err:e.message}; }
        })())`,
        returnByValue: true
      });
      console.log(r.result && r.result.value ? r.result.value : JSON.stringify(r.result));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));