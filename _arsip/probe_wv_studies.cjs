// probe_wv_studies.cjs - isi wv._studies dan _studySources
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
          var out = {};
          try {
            var wv = window.TradingViewApi._activeChartWidgetWV.value();
            var st = wv._studies;
            out.studiesKeys = Object.keys(st);
            out.studiesType = typeof st;
            if (typeof st === 'object' && st) {
              var arr = [];
              if (Array.isArray(st)) {
                for (var i=0;i<st.length;i++) {
                  var s = st[i];
                  var m = s && s.metaInfo ? s.metaInfo() : null;
                  arr.push({ id: s && s.id ? s.id() : '?', name: m ? (m.longName||m.shortId) : '?' });
                }
              } else {
                for (var k in st) { arr.push(k); }
              }
              out.studiesList = arr;
            }
            var pane = wv._chartWidget._controlBarNavigation._targetPaneWidget._state;
            out.paneStudySources = pane._studySources ? Object.keys(pane._studySources) : 'none';
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