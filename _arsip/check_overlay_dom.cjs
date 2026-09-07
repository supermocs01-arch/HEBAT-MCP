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
    ws.on('open', async () => {
      await send('Runtime.enable');
      const r = await send('Runtime.evaluate', { expression: `(function(){
        var ov = document.getElementById('smc_overlay');
        if (!ov) return 'TIDAK ADA smc_overlay di DOM';
        var txt = (ov.innerText || '').split('\\n').slice(0, 15);
        return 'ADA\\n' + txt.join('\\n');
      })()`, returnByValue: true });
      console.log(r.result.value);
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
