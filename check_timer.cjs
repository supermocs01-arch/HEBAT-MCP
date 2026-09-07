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
      const r = await send('Runtime.evaluate', {
        expression: `JSON.stringify({
          hasRefreshId: typeof window._smcRefreshId !== 'undefined' && window._smcRefreshId !== null,
          hasTimer: typeof window._smcTimer !== 'undefined' && window._smcTimer !== null,
          overlayCount: document.querySelectorAll('#smc_overlay').length,
          title: document.getElementById('smc_title') ? document.getElementById('smc_title').textContent : 'MISSING',
          clock: document.getElementById('smc_clock') ? document.getElementById('smc_clock').textContent : 'MISSING'
        })`,
        returnByValue: true
      });
      console.log('Timer check:', r.result.value);
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => console.log(e.message));
