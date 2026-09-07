const http = require('http');
const WebSocket = require('ws');

http.get('http://127.0.0.1:9222/json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    if (!t) { console.log('No chart'); process.exit(1); }
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    let id = 1;
    const pending = {};
    ws.on('message', raw => {
      try {
        const j = JSON.parse(raw.toString());
        if (j.id && pending[j.id]) {
          clearTimeout(pending[j.id].timer);
          const cb = pending[j.id].cb;
          delete pending[j.id];
          if (cb) cb(j.result);
        }
      } catch(e){}
    });
    function send(m, p) {
      return new Promise(r => {
        const mid = ++id;
        pending[mid] = { cb: r, timer: setTimeout(() => { console.log('TIMEOUT mid=' + mid); delete pending[mid]; }, 8000) };
        ws.send(JSON.stringify({ id: mid, method: m, params: p || {} }));
      });
    }
    ws.on('open', async () => {
      await send('Page.enable');
      await send('Runtime.enable');
      const resolutions = ['5', 'D', '240', '60', '30', '15', '5'];
      for (const res of resolutions) {
        try {
          const r = await send('Runtime.evaluate', { expression: "window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.setResolution('" + res + "')", returnByValue: true });
          console.log('Set ' + res + ': ' + (r?.value || 'ok'));
        } catch(e) {
          console.log('Set ' + res + ' ERR: ' + e.message);
        }
        await sleep(2000);
      }
      console.log('All timeframe changes done');
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => console.log('HTTP ERR:', e.message));

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }