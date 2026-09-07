// probe_setvalue_scan.cjs - scan window recursive cari object dengan setValue/getValue
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
          var hits = [];
          var seen = new Set();
          var budget = 20000;
          (function scan(o, path, depth) {
            if (depth > 8 || budget-- < 0) return;
            if (!o || typeof o !== 'object') return;
            if (seen.has(o)) return;
            seen.add(o);
            var keys;
            try { keys = Object.keys(o); } catch(e) { return; }
            for (var i=0;i<keys.length;i++) {
              var k = keys[i];
              var v;
              try { v = o[k]; } catch(e) { continue; }
              if (v && typeof v === 'object') {
                var vk = Object.keys(v);
                if (vk.indexOf('setValue') >= 0 && vk.indexOf('getValue') >= 0) {
                  var len = -1;
                  try { len = v.getValue().length; } catch(e) {}
                  hits.push({path: path + '.' + k, len: len, hasGetModel: typeof v.getModel === 'function'});
                }
                if (vk.indexOf('setValue') >= 0 && vk.indexOf('getModel') >= 0) {
                  try { hits.push({path: path + '.' + k, viaGetModel: true, len: v.getModel().getValue().length}); } catch(e) {}
                }
                scan(v, path + '.' + k, depth + 1);
              }
            }
          })(window, 'w', 0);
          return {hits: hits.slice(0,10), scanned: budget};
        })())`,
        returnByValue: true
      });
      console.log(r.result && r.result.value ? r.result.value : JSON.stringify(r.result));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));