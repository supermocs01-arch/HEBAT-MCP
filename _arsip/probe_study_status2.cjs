// probe_study_status2.cjs - status via value()/getter
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
            function val(x) { if (!x) return null; if (typeof x.value === 'function') { try { return String(x.value()); } catch(e){} } try { return String(x._value); } catch(e){} return String(x).slice(0,80); }
            out.status = val(s._status);
            out.compileActive = val(s._compileActiveStatus);
            out.compileError = val(s._compileErrorStatus);
            out.ready = s._readyState ? val(s._readyState) : null;
            out.prevClose = s._prevClose ? val(s._prevClose) : null;
            out.lastValue = (function(){ try { var v = s.getStudyLastValues ? s.getStudyLastValues() : null; return v ? JSON.stringify(v).slice(0,300) : null; } catch(e){ return 'ERR '+e.message; } })();
            out.expectations = (function(){ try { var m = s.metaInfo ? s.metaInfo() : null; return m ? JSON.stringify(m).slice(0,300) : null; } catch(e){ return 'ERR '+e.message; } })();
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