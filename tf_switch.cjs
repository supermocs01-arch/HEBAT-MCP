const http = require('http');
http.get('http://127.0.0.1:9222/json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) {
      return new Promise(r => {
        const mid = id++;
        const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); r(j.result); } };
        ws.on('message', h);
        ws.send(JSON.stringify({ id: mid, method: m, params: p || {} }));
      });
    }
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    async function e(x) { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true }); return r.result && r.result.value; }
    ws.on('open', async () => {
      await send('Runtime.enable');
      const wv = 'window.TradingViewApi._activeChartWidgetWV.value()';
      console.log('tf now:', await e('JSON.stringify(' + wv + '.resolution())'));
      console.log('set 5:', await e(wv + '.setResolution("5")'));
      await sleep(6000);
      console.log('tf mid:', await e('JSON.stringify(' + wv + '.resolution())'));
      console.log('set 15:', await e(wv + '.setResolution("15")'));
      await sleep(8000);
      console.log('tf back:', await e('JSON.stringify(' + wv + '.resolution())'));
      ws.close();
      process.exit(0);
    });
  });
});