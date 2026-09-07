const http = require('http');
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const targets = JSON.parse(d);
    const chart = targets.find(t => t.url && t.url.includes('/chart/'));
    if (!chart) { console.log('no chart'); process.exit(1); }
    const WebSocket = require('ws');
    const ws = new WebSocket(chart.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) {
      return new Promise(r => {
        const mid = id++;
        const h = raw => {
          const resp = JSON.parse(raw.toString());
          if (resp.id === mid) { ws.removeListener('message', h); r(resp.result); }
        };
        ws.on('message', h);
        ws.send(JSON.stringify({ id: mid, method: m, params: p || {} }));
      });
    }
    ws.on('open', async () => {
      await send('Page.enable');
      await send('Runtime.enable');
      // Set symbol to XAUUSD via chart storage API
      const r = await send('Runtime.evaluate', {
        expression: `JSON.stringify({hasChartObject: !!window.TradingViewApi, sym: window.TradingViewApi ? window.TradingViewApi.symbol() : null})`,
        returnByValue: true
      });
      console.log('API check:', r.result.value);
      // Try chartStorage.setSymbol
      await send('Runtime.evaluate', { expression: `try{window.TradingViewApi._activeChartWidgetWV.value().setSymbol('OANDA:XAUUSD');}catch(e){window.chartStorage.setSymbol('OANDA:XAUUSD');}` });
      await new Promise(r => setTimeout(r, 3000));
      await send('Runtime.evaluate', { expression: `window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.setResolution("60")` });
      console.log('Symbol changed to XAUUSD + H1');
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => console.log(e.message));