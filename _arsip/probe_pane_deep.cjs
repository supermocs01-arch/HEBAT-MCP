// probe_pane_deep.cjs - detil pane: id(), metaInfo(), status, dan cari PINE_DATA di graphics
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
          var out = [];
          try {
            var pane = window.TradingViewApi._activeChartWidgetWV.value()._chartWidget._controlBarNavigation._targetPaneWidget._state;
            var src = pane._studySources;
            for (var k in src) {
              var s = src[k];
              var entry = { pane: k };
              try { entry.id = s.id(); } catch(e) {}
              try { var m = s.metaInfo(); entry.meta = m ? (m.longName || m.shortId || String(m)) : null; } catch(e) { entry.metaErr = e.message; }
              try { var st = s._status; entry.statusKeys = Object.keys(st); entry.statusStr = st.toString ? st.toString().slice(0,60) : '?'; } catch(e) {}
              try { var cs = s._compileErrorStatus; entry.compile = cs ? cs.toString().slice(0,100) : null; } catch(e) {}
              out.push(entry);
            }
          } catch(e) { out.push({err: e.message}); }
          return out;
        })())`,
        returnByValue: true
      });
      console.log(r.result && r.result.value ? r.result.value : JSON.stringify(r.result));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));