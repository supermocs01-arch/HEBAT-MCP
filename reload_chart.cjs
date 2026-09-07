const http = require('http');
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    if (!t) { console.log('Chart not found'); process.exit(1); }
    const WebSocket = require('ws');
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) { return new Promise(r => { const msgId = id++; const h = (raw) => { const resp = JSON.parse(raw.toString()); if (resp.id === msgId) { ws.removeListener('message', h); r(resp.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: msgId, method: m, params: p || {} })); }); }
    ws.on('open', async () => {
      await send('Page.enable');
      await send('Page.reload', { ignoreCache: true });
      console.log('RELOAD SENT');
      setTimeout(() => process.exit(0), 2000);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });