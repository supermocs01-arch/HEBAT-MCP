const http = require('http');
http.get('http://127.0.0.1:9222/json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
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
      const expr = "(function(){var o=document.getElementById('smc_overlay');return o?('FOUND: '+o.innerText.replace(/\\n/g,' | ').slice(0,160)):'NOT FOUND';})()";
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      console.log('DOM:', r.result.value);
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
