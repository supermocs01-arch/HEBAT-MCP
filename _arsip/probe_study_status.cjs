// probe_study_status.cjs - status compile study pane 4 + cek legend DOM
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
            var st = s._status;
            out.statusValue = st && st._value !== undefined ? String(st._value) : '?';
            out.compiledActive = s._compileActiveStatus ? String(s._compileActiveStatus) : '?';
            out.compileError = s._compileErrorStatus ? (s._compileErrorStatus._value !== undefined ? String(s._compileErrorStatus._value) : String(s._compileErrorStatus)) : '?';
            out.pineSource = s._pineSourceCodeModel ? 'present' : 'none';
            out.id = s.id ? s.id() : '?';
            out.isStarted = s._isStarted;
            out.seriesCount = s._series ? s._series.length : 'none';
            // cek label legend di DOM
            var legend = document.querySelectorAll('.legend-title, .tv-legend__title');
            var names = [];
            for (var i=0;i<legend.length;i++) names.push(legend[i].textContent.trim().slice(0,60));
            out.legendTitles = names;
            // cek status bar editor error text
            var errEl = document.querySelectorAll('.pine-editor-status, .tv-statusbar__text');
            var et = [];
            for (var j=0;j<errEl.length;j++) et.push(errEl[j].textContent.trim().slice(0,80));
            out.statusbar = et.slice(0,5);
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