// probe_dwglabels.cjs - baca dwglabels & dwgboxes dari study Pine
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
          var out = {labels: [], boxes: 0, rawSamples: []};
          try {
            var pane = window.TradingViewApi._activeChartWidgetWV.value()._chartWidget._controlBarNavigation._targetPaneWidget._state;
            var s = pane._studySources['4'];
            var pc = s._graphics._primitivesCollection;
            function inspect(collName) {
              try {
                var coll = pc[collName];
                if (!coll) return;
                out[collName] = out[collName] || { type: typeof coll };
                var lm = coll.get ? coll.get(false) : coll;
                var map = lm && (lm._primitivesDataById || lm._items || lm);
                var ids = Object.keys(map || {});
                out[collName].count = ids.length;
                if (collName === 'dwglabels') {
                  for (var key in map) {
                    var it = map[key];
                    var txt = it && (it._text || it.text || '');
                    if (String(txt).length) out.labels.push({id:key, text:String(txt).slice(0,200)});
                    if (out.labels.length >= 5) break;
                  }
                }
              } catch(e) { out[collName].err = e.message; }
            }
            inspect('dwglabels');
            inspect('dwgboxes');
            inspect('dwgtablecells');
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