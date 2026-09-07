const http = require('http');
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    if (!t) { console.log('no chart'); process.exit(1); }
    const WebSocket = require('ws');
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) { return new Promise(r => { const mid = id++; const h = raw => { const resp = JSON.parse(raw.toString()); if (resp.id === mid) { ws.removeListener('message', h); r(resp.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); }); }
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    ws.on('open', async () => {
      await send('Runtime.enable');
      const target = process.argv[2] || 'BINANCE:BTCUSDT';
      const cur = await send('Runtime.evaluate', { expression: `window.TradingViewApi._activeChartWidgetWV.value().symbol()`, returnByValue: true });
      console.log('Symbol sekarang:', cur.result.value);
      await send('Runtime.evaluate', { expression: `window.TradingViewApi._activeChartWidgetWV.value().setSymbol('${target}')` });
      console.log('Mengganti ke', target, '...');
      await sleep(15000);
      const now = await send('Runtime.evaluate', { expression: `window.TradingViewApi._activeChartWidgetWV.value().symbol()`, returnByValue: true });
      console.log('Symbol sekarang:', now.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });