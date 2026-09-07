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
            var ms = window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.model().m_model;
            var p = ms._properties;
            var cs = p.mainSeriesProperties.candleStyle;
            var dump = function(name, o){
              var out = name + '=';
              if (o === null || o === undefined) return out + String(o);
              if (typeof o !== 'object') return out + String(o);
              var parts = [];
              try { Object.keys(o).forEach(function(k){
                var v = o[k];
                if (typeof v === 'object') parts.push(k + ':[obj]');
                else if (typeof v === 'string') parts.push(k + '=' + v);
                else parts.push(k + '=' + String(v));
              }); } catch(e) { parts.push('keys-err'); }
              return out + '{' + parts.join(',') + '}';
            };
            var res = [
              dump('BG', p.paneProperties.background),
              dump('BGtype', p.paneProperties.backgroundType),
              dump('UP', cs.upColor),
              dump('DN', cs.downColor),
              dump('BU', cs.borderUpColor),
              dump('BD', cs.borderDownColor),
              dump('WU', cs.wickUpColor),
              dump('WD', cs.wickDownColor)
            ].join(' || ');
            return res;
          } catch(e) { return 'ERR:' + e.message; }
        })()`,
        returnByValue: true
      });
      console.log(r.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });