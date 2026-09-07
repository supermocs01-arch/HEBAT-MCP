// probe_fiber.cjs - cek props fiber editor pine untuk inject
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
          var out = {found:false, propsKeys:[], fiberKeys:[]};
          try {
            var c = document.querySelector(".monaco-editor.pine-editor-monaco");
            if (!c) return out;
            out.found = true;
            var el = c, fk = null;
            for (var i=0;i<25;i++){
              if (!el) break;
              fk = Object.keys(el).find(function(k){return k.indexOf('__reactFiber$')===0});
              if (fk) break;
              el = el.parentElement;
            }
            if (fk) {
              var cur = el[fk];
              var depth = 0;
              while (cur && depth < 20) {
                if (cur.memoizedProps) {
                  var pk = Object.keys(cur.memoizedProps);
                  out.propsKeys.push(pk.slice(0,15));
                  if (pk.indexOf('monacoEnv')>=0) { out.monacoEnvAt = depth; out.monacoEnvKeys = Object.keys(cur.memoizedProps.monacoEnv); break; }
                }
                cur = cur.return;
                depth++;
              }
              out.fiberKeys = Object.keys(el[fk]).filter(function(k){return /state|props|memoized/i.test(k)});
            }
          } catch(e){ out.err = e.message; }
          return out;
        })())`,
        returnByValue: true
      });
      console.log(r.result && r.result.value ? r.result.value : JSON.stringify(r.result));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));