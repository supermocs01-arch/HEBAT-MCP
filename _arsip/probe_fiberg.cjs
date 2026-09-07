// probe_fiber2.cjs - cari reactFiber di semua node menuju editor
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
            var fk = null, node = null;
            var el = c;
            for (var i=0;i<40;i++){
              if (!el) break;
              var keys = Object.keys(el);
              fk = keys.find(function(k){return k.indexOf('__reactFiber$')===0});
              if (fk) { node = el; break; }
              el = el.parentElement;
            }
            if (!fk) return {fk:null};
            var cur = node[fk];
            var path = [];
            var found = null;
            for (var d=0; d<30 && cur; d++){
              var pk = cur.memoizedProps ? Object.keys(cur.memoizedProps) : [];
              path.push({depth:d, type: cur.type ? (cur.type.name||cur.type.displayName||String(cur.type).slice(0,30)) : '?', pk: pk.slice(0,8)});
              if (pk.indexOf('monacoEnv')>=0) { found = d; break; }
              cur = cur.return;
            }
            return {fk:true, foundAt:found, path:path.slice(0,12)};
          } catch(e){ return {err:e.message}; }
        })())`,
        returnByValue: true
      });
      console.log(r.result && r.result.value ? r.result.value : JSON.stringify(r.result));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));