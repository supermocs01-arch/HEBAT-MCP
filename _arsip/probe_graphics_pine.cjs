// probe_graphics_pine.cjs - baca _graphics dari study Pine (pane 4) utk cari label PINE_DATA
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
          var out = {graphicsKeys: [], collections: {}, labels: []};
          try {
            var pane = window.TradingViewApi._activeChartWidgetWV.value()._chartWidget._controlBarNavigation._targetPaneWidget._state;
            var s = pane._studySources['4'];
            var g = s._graphics;
            out.graphicsKeys = Object.keys(g);
            if (g._primitivesCollection) {
              var pc = g._primitivesCollection;
              out.collections = Object.keys(pc);
              var dwl = pc.dwglines || pc.dwg && pc.dwg.lines;
              if (dwl) {
                var lm = dwl.get ? dwl.get(false) : dwl;
                if (lm) {
                  var map = lm._primitivesDataById || lm;
                  var ids = Object.keys(map);
                  out.labelCount = ids.length;
                  var found = 0;
                  for (var key in map) {
                    var it = map[key];
                    var txt = it && (it._text || it.text || '');
                    if (String(txt).indexOf('PINE_DATA') >= 0) {
                      out.labels.push(String(txt).slice(0, 200));
                      found++;
                      if (found >= 3) break;
                    }
                  }
                }
              }
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