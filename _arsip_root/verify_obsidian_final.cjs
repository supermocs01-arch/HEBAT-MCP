const http = require('http');
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p) => new Promise(r => { const mid = id++; const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); r(j.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); });
    ws.on('open', async () => {
      await send('Runtime.enable');
      const r = await send('Runtime.evaluate', {
        expression: `(function(){
          try {
            var wv = window.TradingViewApi._activeChartWidgetWV.value();
            var ms = wv._chartWidget.model().m_model;
            var p = ms._properties;
            var cs = p.mainSeriesProperties.candleStyle;
            var ov = document.getElementById('__hebat_overlay');
            var str = function(v){
              if (v === null || v === undefined) return String(v);
              if (typeof v === 'string') return v;
              if (typeof v === 'number' || typeof v === 'boolean') return String(v);
              if (typeof v === 'object') {
                try { var s = JSON.stringify(v); return s && s.length < 100 ? s : '[obj]'; }
                catch(e) { return '[circular]'; }
              }
              return String(v);
            };
            return 'BG=' + str(p.paneProperties.background)
              + ' | UP=' + str(cs.upColor)
              + ' | DN=' + str(cs.downColor)
              + ' | BU=' + str(cs.borderUpColor)
              + ' | BD=' + str(cs.borderDownColor)
              + ' | WU=' + str(cs.wickUpColor)
              + ' | WD=' + str(cs.wickDownColor)
              + ' | OVERLAY=' + (ov ? 'w:' + ov.offsetWidth + ' h:' + ov.offsetHeight + ' [' + (ov.innerText||'').slice(0,80).replace(/\\n/g,';') + ']' : 'MISSING');
          } catch(e) { return 'ERR:' + e.message; }
        })()`,
        returnByValue: true
      });
      console.log(r.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });