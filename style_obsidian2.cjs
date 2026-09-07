const http = require('http');
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p) => new Promise(r => { const mid = id++; const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); r(j.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); });
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    ws.on('open', async () => {
      await send('Runtime.enable');
      const r = await send('Runtime.evaluate', {
        expression: `(function(){
          var out = {};
          try {
            var wv = window.TradingViewApi._activeChartWidgetWV.value();
            var mm = wv._chartWidget.model().m_model;
            var ms = mm.mainSeries();
            var pv = ms._paneView;
            var bars = pv._bars;
            var up=0, dn=0;
            if (bars) {
              for (var i=0;i<bars.length;i++){
                var b = bars[i];
                var bull = b.close >= b.open;
                b.color = bull ? '#ffffff' : '#000000';
                b.borderColor = '#ffffff';
                b.wickColor = '#ffffff';
                b.hollow = false;
                if (bull) up++; else dn++;
              }
            }
            out.bars = bars ? bars.length : 0;
            out.up = up; out.dn = dn;
            pv._invalidated = true;
            try { ms.emit('dataUpdated'); } catch(e){ out.e1 = e.message; }
            try { mm.emit('dataUpdated'); } catch(e){ out.e2 = e.message; }
            try { wv._chartWidget._invalidationMask = 1; } catch(e){}
            return JSON.stringify(out);
          } catch(e){ return 'ERR: '+e.message; }
        })()`,
        returnByValue: true
      });
      console.log(r.result.value);
      await sleep(2500);
      const r2 = await send('Runtime.evaluate', {
        expression: `(function(){
          var wv = window.TradingViewApi._activeChartWidgetWV.value();
          var pv = wv._chartWidget.model().m_model.mainSeries()._paneView;
          var bars = pv._bars;
          if (!bars || !bars.length) return 'no bars';
          var b = bars[bars.length-1];
          return JSON.stringify({ color: b.color, border: b.borderColor, wick: b.wickColor });
        })()`,
        returnByValue: true
      });
      console.log('CHECK:', r2.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });