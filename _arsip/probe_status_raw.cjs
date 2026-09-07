// probe_status_raw.cjs - dump JSON status & error study
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
        expression: `(function(){
          var out = {};
          try {
            var pane = window.TradingViewApi._activeChartWidgetWV.value()._chartWidget._controlBarNavigation._targetPaneWidget._state;
            var s = pane._studySources['4'];
            try { out.statusRaw = JSON.stringify(s._status); } catch(e) { out.statusRaw = 'ERR ' + e.message; }
            try { out.compileErrRaw = JSON.stringify(s._compileErrorStatus); } catch(e) { out.compileErrRaw = 'ERR ' + e.message; }
            try { out.compileActiveRaw = JSON.stringify(s._compileActiveStatus); } catch(e) { out.compileActiveRaw = 'ERR ' + e.message; }
            try { out.isStarted = s._isStarted; } catch(e) {}
            try { out.errorMsgs = s._errorMessages ? JSON.stringify(s._errorMessages).slice(0,400) : 'none'; } catch(e) {}
          } catch(e) { out.err = e.message; }
          return JSON.stringify(out);
        })()`,
        returnByValue: true
      });
      console.log(r.result && r.result.value ? r.result.value : JSON.stringify(r.result));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));