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
      const r = await send('Runtime.evaluate', {
        expression: `(function(){
          var out = [];
          var wraps = document.querySelectorAll('[class*="colorPickerWrap"]');
          wraps.forEach(function(w){
            if (w.offsetParent === null) return;
            out.push({ text: (w.innerText||'').slice(0,120).replace(/\\n/g,' | '), html: w.innerHTML.slice(0,400) });
          });
          return JSON.stringify(out);
        })()`,
        returnByValue: true
      });
      console.log('POPUP:', r.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });