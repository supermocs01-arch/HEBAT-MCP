// shot.cjs - screenshot halaman ke file png
const http = require('http');
const fs = require('fs');
http.get('http://127.0.0.1:9222/json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    if (!t) { console.log('no chart'); process.exit(1); }
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) { return new Promise(r => { const mid = id++; const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); r(j.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); }); }
    ws.on('open', async () => {
      await send('Page.enable');
      const r = await send('Page.captureScreenshot', { format: 'png' });
      if (r && r.data) {
        fs.writeFileSync('C:/HEBAT/shot.png', Buffer.from(r.data, 'base64'));
        console.log('saved C:/HEBAT/shot.png', r.data.length, 'bytes');
      } else console.log('fail', JSON.stringify(r));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));