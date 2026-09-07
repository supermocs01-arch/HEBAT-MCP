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
      await send('Runtime.evaluate', { expression: 'window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.setResolution("60")' });
      console.log('H1 set');
      ws.close();
    });
  });
}).on('error', e => console.log(e.message));
