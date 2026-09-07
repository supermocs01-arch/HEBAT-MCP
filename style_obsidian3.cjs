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
          try {
            var wv = window.TradingViewApi._activeChartWidgetWV.value();
            var ms = wv._chartWidget.model().m_model;
            var cs = ms._properties.mainSeriesProperties.candleStyle;
            var out = [];
            var set = function(prop, val){
              if (prop && typeof prop.setValue === 'function') { prop.setValue(val); out.push(prop._name + '=' + prop._value); }
              else out.push(prop._name + ':no-set');
            };
            set(cs.upColor, '#ffffff');
            set(cs.downColor, '#000000');
            set(cs.borderUpColor, '#ffffff');
            set(cs.borderDownColor, '#ffffff');
            set(cs.wickUpColor, '#ffffff');
            set(cs.wickDownColor, '#ffffff');
            ms._properties.paneProperties.background.setValue('#000000');
            out.push('bg=' + ms._properties.paneProperties.background._value);
            if (typeof ms.recalcAll === 'function') { ms.recalcAll(); out.push('recalcAll:ok'); }
            if (typeof ms.invalidateHandler === 'function') { ms.invalidateHandler({}); out.push('invalidate:ok'); }
            return out.join(' | ');
          } catch(e) { return 'ERR:' + e.message; }
        })()`,
        returnByValue: true
      });
      console.log(r.result.value);
      await sleep(1500);
      const r2 = await send('Runtime.evaluate', {
        expression: `(function(){
          var ms = window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.model().m_model;
          var cs = ms._properties.mainSeriesProperties.candleStyle;
          return 'VERIFY: up=' + cs.upColor._value + ' dn=' + cs.downColor._value + ' wu=' + cs.wickUpColor._value + ' wd=' + cs.wickDownColor._value;
        })()`,
        returnByValue: true
      });
      console.log(r2.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });