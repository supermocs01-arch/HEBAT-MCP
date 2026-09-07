// probe_pine_source_study.cjs - baca source code model dari study (yang dikompilasi)
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
            var pane = window.TradingViewApi._activeChartWidgetWV.value()._chartWidget._controlBarNavigation._targetPaneWidget._state;
            var s = pane._studySources['4'];
            var pm = s._pineSourceCodeModel;
            out.pineSourceModelKeys = pm ? Object.keys(pm) : 'none';
            out.pineSourceType = typeof pm;
            if (pm && typeof pm === 'object') {
              // cari method getValue / value / source
              for (var k in pm) {
                var v = pm[k];
                if (typeof v === 'function') out.pineSourceModelKeys.push(k + ':[fn]');
              }
              try { out.pineSourceVal = pm.getValue ? pm.getValue().slice(0,300) : 'no getValue'; } catch(e) {}
              try { out.pineSourceVal2 = pm._source ? String(pm._source).slice(0,300) : 'no _source'; } catch(e) {}
              try { out.pineSourceVal3 = pm.source ? String(pm.source).slice(0,300) : 'no source'; } catch(e) {}
            }
            // juga cek di metaInfo
            var m = s.metaInfo();
            out.metaKeys = m ? Object.keys(m).slice(0,40) : 'none';
            if (m && m.payload) out.metaPayload = JSON.stringify(m.payload).slice(0,500);
            if (m && m.id) out.metaId = m.id;
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