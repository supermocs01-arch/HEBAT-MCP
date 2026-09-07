const http = require('http');
http.get('http://127.0.0.1:9222/json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    if (!t) { console.log('No chart found'); return; }
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p) => new Promise(r => {
      const mid = id++;
      const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); r(j.result); } };
      ws.on('message', h);
      ws.send(JSON.stringify({ id: mid, method: m, params: p || {} }));
    });
    ws.on('open', async () => {
      await send('Runtime.enable');
      // Switch symbol to XAUUSD via chart widget
      const expr = `(function(){
        var wv=window.TradingViewApi._activeChartWidgetWV.value();
        if(wv) wv.setSymbol('OANDA:XAUUSD',function(){});
        return 'Symbol set to OANDA:XAUUSD';
      })()`;
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      console.log(r.result.value);
      ws.close();
    });
  });
}).on('error', e => { console.error(e.message); });
