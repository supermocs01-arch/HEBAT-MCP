// probe_fiber_dfs.cjs - DFS fiber tree dari root chart, cari instance monaco editor
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
          // temukan fiber root dari editor
          var ed = document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1] || document.querySelectorAll('.monaco-editor.pine-editor-monaco')[0];
          var el = ed, fk = null;
          for (var i=0;i<60;i++) {
            if (!el) break;
            var keys = Object.keys(el);
            fk = keys.find(function(k){ return k.indexOf('__reactFiber$') === 0; });
            if (fk) break;
            el = el.parentElement;
          }
          if (!fk) return {err: 'no fiber'};
          var root = el[fk];
          while (root.return) root = root.return; // naik ke root
          var out = {hits: []};
          var visited = 0;
          var max = 200000;
          (function dfs(f, depth) {
            if (!f || visited++ > max) return;
            try {
              var inst = f.stateNode;
              if (inst && typeof inst === 'object') {
                if (typeof inst.getValue === 'function' && typeof inst.setValue === 'function') {
                  var len;
                  try { len = inst.getValue().length; } catch(e) {}
                  out.hits.push({depth: depth, len: len, t: f.type ? String(f.type).slice(0,30) : '?', kind: 'editor'});
                }
              }
            } catch(e) {}
            dfs(f.child, depth + 1);
            dfs(f.sibling, depth);
          })(root, 0);
          out.visited = visited;
          return out;
        })())`,
        returnByValue: true
      });
      console.log(r.result && r.result.value ? r.result.value : JSON.stringify(r.result));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));