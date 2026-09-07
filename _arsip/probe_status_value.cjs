// probe_status_value.cjs - baca ._value dari status wrapper
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
            function v(wrapper, name) {
              try {
                if (!wrapper) return 'null';
                if (wrapper._value !== undefined) return JSON.stringify(wrapper._value).slice(0,300);
                if (typeof wrapper.value === 'function') return JSON.stringify(wrapper.value()).slice(0,300);
                return 'no _value';
              } catch(e) { return 'ERR ' + name + ':' + e.message; }
            }
            out.status = v(s._status, 'status');
            out.compileErr = v(s._compileErrorStatus, 'compileErr');
            out.compileActive = v(s._compileActiveStatus, 'compileActive');
            out.session = v(s._sessionInfo, 'session');
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