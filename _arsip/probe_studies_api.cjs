// probe_studies_api.cjs - temukan cara akses studi di model untuk versi ini
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
          function scan(obj, keyRe, depth, path, out) {
            if (depth <= 0) return;
            if (!obj || typeof obj !== 'object') return;
            var keys = [];
            try { keys = Object.keys(obj); } catch(e) { return; }
            for (var i=0;i<keys.length;i++) {
              var k = keys[i];
              var re = keyRe.test(k);
              var v = obj[k];
              if (re && typeof v === 'function') { out.push(path + '.' + k + ' [fn]'); }
              else if (re && v && typeof v === 'object') { out.push(path + '.' + k + ' [obj]'); }
              else if (!re && v && typeof v === 'object' && k.indexOf('_') === 0) {
                scan(v, /study/i, depth-1, path + '.' + k, out);
              }
            }
          }
          var out = [];
          try {
            var wv = window.TradingViewApi._activeChartWidgetWV.value();
            var model = wv._chartWidget.model();
            scan(model, /stud/i, 2, 'model', out);
            // juga cek source dalam _chartWidget
            scan(wv, /stud/i, 6, 'wv', out);
          } catch(e) { out.push('ERR ' + e.message); }
          return out;
        })())`,
        returnByValue: true
      });
      console.log(r.result && r.result.value ? r.result.value : JSON.stringify(r.result));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));