const http = require('http');
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const targets = JSON.parse(d);
    const chart = targets.find(t => t.url && t.url.includes('/chart/') && !t.url.includes('doubleclick') && !t.url.includes('google'));
    if (!chart) { console.log('Chart not found'); process.exit(1); }
    const WebSocket = require('ws');
    const ws = new WebSocket(chart.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) { return new Promise(r => { const msgId = id++; const h = (raw) => { const resp = JSON.parse(raw.toString()); if (resp.id === msgId) { ws.removeListener('message', h); r(resp.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: msgId, method: m, params: p || {} })); }); }
    ws.on('open', async () => {
      await send('Page.enable');
      await send('Runtime.enable');

      // Switch to 1H
      const r = await send('Runtime.evaluate', { expression: `(function(){
        var api = window.TradingViewApi;
        var wv = api._activeChartWidgetWV.value();
        var cw = wv._chartWidget;
        cw.setResolution('60');
        return 'changed to 1H';
      })()` });
      console.log(r.result.value);
      
      // Wait for data to load
      await new Promise(r => setTimeout(r, 3000));

      // Get the data
      const r2 = await send('Runtime.evaluate', { expression: `(function(){
        var api = window.TradingViewApi;
        var wv = api._activeChartWidgetWV.value();
        var cw = wv._chartWidget;
        var model = cw.model();
        var series = model.mainSeries();
        
        // Collect bars
        try {
          var data = series.bars();
          if (!data || !data.size) return JSON.stringify({err:'no bars'});
          var count = data.size();
          var o=[], h=[], l=[], c=[], t=[];
          for (var i = 0; i < count && i < 30; i++) {
            var bar = data.valueAt(i);
            if (bar) {
              o.push(bar.open);
              h.push(bar.high);
              l.push(bar.low);
              c.push(bar.close);
              t.push(new Date(bar.time * 1000).toISOString());
            }
          }
          return JSON.stringify({count: count, opens: o.slice(-10), highs: h.slice(-10), lows: l.slice(-10), closes: c.slice(-10), times: t.slice(-10)});
        } catch(e) { return JSON.stringify({err: e.message}); }
      })()` });

      const data = JSON.parse(r2.result.value);
      console.log('H1 Data count:', data.count);
      console.log('Last 5 H1 bars:');
      for (var i = Math.max(0, data.closes.length-5); i < data.closes.length; i++) {
        console.log('  ' + data.times[i] + ' O:' + data.opens[i] + ' H:' + data.highs[i] + ' L:' + data.lows[i] + ' C:' + data.closes[i]);
      }

      // Now analyze SMC on H1
      if (data.closes.length >= 10) {
        var closes = data.closes;
        var highs = data.highs;
        var lows = data.lows;
        var opens = data.opens;
        var last = closes.length-1;
        var price = closes[last];

        // Trend
        var sma50 = closes.slice(-20).reduce(function(a,b){return a+b},0) / Math.min(20, closes.length);
        var trend = price > sma50 ? 'BULLISH' : 'BEARISH';

        // RSI
        var gains=0, losses=0;
        for (var i = closes.length-8; i < closes.length; i++) {
          if (i <= 0) continue;
          var diff = closes[i] - closes[i-1];
          if (diff > 0) gains += diff; else losses -= diff;
        }
        var rsi = gains+losses === 0 ? 50 : 100 - 100/(1+(gains/7)/(losses/7));

        // Swing High/Low
        var swingH = null, swingL = null;
        for (var i = 2; i < closes.length-2; i++) {
          if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
            if (swingH === null || highs[i] > swingH) swingH = highs[i];
          }
          if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
            if (swingL === null || lows[i] < swingL) swingL = lows[i];
          }
        }

        console.log('\n=== H1 SMC ANALYSIS ===');
        console.log('Harga:', price.toFixed(2));
        console.log('SMA20:', sma50.toFixed(2));
        console.log('Trend:', trend);
        console.log('RSI(7):', rsi.toFixed(2));
        console.log('Swing High:', swingH);
        console.log('Swing Low:', swingL);

        // BOS detection
        var bosBullish = false, bosBearish = false;
        if (swingH && highs[last] > swingH) bosBullish = true;
        if (swingL && lows[last] < swingL) bosBearish = true;
        console.log('Bullish BOS:', bosBullish ? 'YES' : 'NO');
        console.log('Bearish BOS:', bosBearish ? 'YES' : 'NO');

        // FVG detection (simplified 3-bar)
        var fvg = null;
        for (var i = 1; i < closes.length-1; i++) {
          // Bullish FVG: middle bar high < current bar low
          if (highs[i] < lows[i+1]) {
            fvg = {type: 'BULLISH', from: highs[i], to: lows[i+1]};
          }
          // Bearish FVG: middle bar low > current bar high  
          if (lows[i] > highs[i+1]) {
            fvg = {type: 'BEARISH', from: highs[i+1], to: lows[i]};
          }
        }
        if (fvg) console.log('FVG:', fvg.type, fvg.from.toFixed(2), '-', fvg.to.toFixed(2));
        else console.log('FVG: NONE');
      }

      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
