const http = require('http');
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p) => new Promise(r => { const mid = id++; const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); r(j.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); });
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    ws.on('open', async () => {
      await send('Runtime.enable');
      await send('Runtime.evaluate', {
        expression: `(function(){
          // tutup dialog kalau masih terbuka: cari tombol Close/Ok
          var btns = document.querySelectorAll('button, [role="button"]');
          var done = 0;
          btns.forEach(function(b){
            if (done) return;
            var tx = (b.innerText||'').trim();
            if (b.offsetParent !== null && (tx === 'Ok' || tx === 'Close' || tx === 'Batal' || tx === 'Cancel')) {
              var rect = b.getBoundingClientRect();
              window.__ok = { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
              done = 1;
            }
          });
          return JSON.stringify(window.__ok);
        })()`,
        returnByValue: true
      });
      await sleep(500);
      const r2 = await send('Runtime.evaluate', {
        expression: `(function(){ return window.__ok ? JSON.stringify(window.__ok) : 'none'; })()`,
        returnByValue: true
      });
      if (r2.result.value !== 'none') {
        const p = JSON.parse(r2.result.value);
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 });
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
        await sleep(1500);
        console.log('dialog closed');
      } else {
        console.log('no dialog button found');
      }
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });