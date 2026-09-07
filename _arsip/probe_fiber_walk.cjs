// probe_fiber_walk.cjs - traverse fiber dari editor [1] cari instance monaco (model.setValue)
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
          var out = {levels: []};
          var el = ed;
          var fk = null;
          for (var i=0;i<50;i++) {
            if (!el) break;
            var keys = Object.keys(el);
            fk = keys.find(function(k){ return k.indexOf('__reactFiber$') === 0; });
            if (fk) break;
            el = el.parentElement;
          }
          if (!fk) return {levels: [], err: 'no fiber'};
          var cur = el[fk];
          var depth = 0;
          while (cur && depth < 60) {
            var pk = cur.memoizedProps ? Object.keys(cur.memoizedProps) : [];
            var inst = cur.stateNode;
            var instKeys = (inst && typeof inst === 'object') ? Object.keys(inst).slice(0,15) : [];
            var typeName = cur.type ? (cur.type.name || cur.type.displayName || String(cur.type).slice(0,40)) : '?';
            out.levels.push({d: depth, t: typeName, pk: pk.slice(0,6), instKeys: instKeys});
            // cari editor instance: punya getModel & getValue
            if (inst && typeof inst === 'object' && typeof inst.getValue === 'function') {
              out.editorAt = depth;
              out.hasSetValue = typeof inst.setValue === 'function';
              try { out.editorValueLen = inst.getValue().length; } catch(e) {}
              break;
            }
            cur = cur.return;
          }
          return out;
        })())`,
        returnByValue: true
      });
      console.log(r.result && r.result.value ? r.result.value : JSON.stringify(r.result));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));