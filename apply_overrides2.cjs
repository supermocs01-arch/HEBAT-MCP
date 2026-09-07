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
            var cw = window.TradingViewApi._activeChartWidgetWV.value()._chartWidget;
            var cwKeys = Object.keys(cw);
            var chartKeys = typeof cw.chart === 'function' ? Object.keys(cw.chart()) : null;
            var overridesApplied = false;
            if (typeof cw.chart === 'function') {
              var c = cw.chart();
              if (c && typeof c.applyOverrides === 'function') {
                c.applyOverrides({
                  'paneProperties.background': '#000000',
                  'paneProperties.backgroundType': 'solid',
                  'paneProperties.vertGridProperties.color': '#333333',
                  'paneProperties.horzGridProperties.color': '#333333',
                  'scalesProperties.textColor': '#888888',
                  'mainSeriesProperties.candleStyle.upColor': '#ffffff',
                  'mainSeriesProperties.candleStyle.downColor': '#000000',
                  'mainSeriesProperties.candleStyle.borderUpColor': '#ffffff',
                  'mainSeriesProperties.candleStyle.borderDownColor': '#ffffff',
                  'mainSeriesProperties.candleStyle.wickUpColor': '#ffffff',
                  'mainSeriesProperties.candleStyle.wickDownColor': '#ffffff'
                });
                overridesApplied = true;
              }
            }
            return JSON.stringify({ chartKeys: chartKeys ? chartKeys.slice(0,30) : null, overridesApplied: overridesApplied });
          } catch(e) { return 'ERR:' + e.message; }
        })()`,
        returnByValue: true
      });
      console.log(r.result.value);
      await sleep(1200);
      const r2 = await send('Runtime.evaluate', {
        expression: `(function(){
          try {
            var ms = window.TradingViewApi._activeChartWidgetWV.value()._chartWidget._model;
            var p = ms._properties;
            return JSON.stringify({
              bg: p.paneProperties.background,
              up: p.mainSeriesProperties.candleStyle.upColor,
              down: p.mainSeriesProperties.candleStyle.downColor
            });
          } catch(e) { return 'ERR'; }
        })()`,
        returnByValue: true
      });
      console.log('MODEL:', r2.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });