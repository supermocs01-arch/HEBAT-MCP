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
          var out = {set:[]};
          try {
            var mm = window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.model().m_model;
            var ms = mm.mainSeries();
            var cs = ms._properties.candleStyle;
            var map = { upColor:'#ffffff', downColor:'#000000', borderColor:'#ffffff', borderUpColor:'#ffffff', borderDownColor:'#ffffff', wickUpColor:'#ffffff', wickDownColor:'#ffffff' };
            var keys = Object.keys(map);
            for (var i=0;i<keys.length;i++){
              var k = keys[i], v = map[k];
              try {
                var pv = cs[k];
                if (pv && typeof pv.setValue === 'function') { pv.setValue(v); out.set.push(k+'=setValue'); }
                else if (pv) { pv._value = v; out.set.push(k+'=_value'); }
                else { out.set.push(k+'=none'); }
              } catch(e){ out.set.push(k+'=ERR:'+e.message); }
            }
            try { if (cs.drawWick && cs.drawWick.setValue) cs.drawWick.setValue(true); } catch(e){}
            try { if (cs.drawBorder && cs.drawBorder.setValue) cs.drawBorder.setValue(true); } catch(e){}
            try { if (cs.barColorsOnPrevClose && cs.barColorsOnPrevClose.setValue) cs.barColorsOnPrevClose.setValue(false); } catch(e){}
            try { var bg = mm._backgroundColor; if (bg && bg.setValue) { bg.setValue('#000000'); out.set.push('bg=setValue'); } } catch(e){ out.set.push('bg=ERR:'+e.message); }
          } catch(e){ out.err = e.message; }
          return JSON.stringify(out);
        })()`,
        returnByValue: true
      });
      console.log(r.result.value);
      await sleep(4000);
      const r2 = await send('Runtime.evaluate', {
        expression: `window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.setResolution('15')`,
        returnByValue: true
      });
      await sleep(2500);
      const r3 = await send('Runtime.evaluate', {
        expression: `window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.setResolution('60')`,
        returnByValue: true
      });
      await sleep(2500);
      console.log('REPAINT done');
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });