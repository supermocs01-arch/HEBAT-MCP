// probe_fiber_real.cjs - cari react fiber instance monaco di editor [1]
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
          var ed = document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1] || document.querySelectorAll('.monaco-editor.pine-editor-monaco')[0];
          if (!ed) return {err:'no ed'};
          var out = {found: false};
          var el = ed;
          var lastFib = null;
          for (var i=0;i<50;i++) {
            if (!el) break;
            var keys = Object.keys(el);
            var fk = keys.find(function(k){ return k.indexOf('__reactFiber$') === 0 || k.indexOf('reactFiber') >= 0; });
            if (fk) { lastFib = { on: el.tagName + '.' + String(el.className).slice(0,40), key: fk }; break; }
            el = el.parentElement;
          }
          if (!lastFib) return {found:false};
          out.found = true;
          out.at = lastFib;
          return out;
        })())`,
        returnByValue: true
      });
      console.log(r.result && r.result.value ? r.result.value : JSON.stringify(r.result));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));