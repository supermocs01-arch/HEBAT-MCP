const http = require('http');
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
      await send('Page.enable'); await send('Runtime.enable');
      // cari tombol "Pine Editor" atau "+" -> cek tombol2 yang ada
      const r0 = await send('Runtime.evaluate', {
        expression: `(function(){var out=[];var btns=document.querySelectorAll("button,[role=button]");for(var i=0;i<btns.length;i++){var t=(btns[i].getAttribute("data-name")||btns[i].getAttribute("aria-label")||btns[i].textContent||"").trim();if(t&&/pine|editor|script/i.test(t))out.push(t)}return out.slice(0,20).join(" | ")})()`,
        returnByValue: true
      });
      console.log('Tombol pine:', r0.result ? r0.result.value : '-');

      // coba pendekatan: buka via keyboard? Cek semua tombol untuk btn "xtk" rumus (formula)
      const rX = await send('Runtime.evaluate', {
        expression: `(function(){var out=[];var els=document.querySelectorAll("button");for(var i=0;i<els.length;i++){var t=(els[i].getAttribute("data-name")||els[i].textContent||"").trim();if(t)out.push(t)}return out.slice(0,60).join(" && ")})()`,
        returnByValue: true
      });
      console.log('all btns:', rX.result ? rX.result.value : JSON.stringify(rX));

      process.exit(0);
    });
  });
}).on('error', e => console.log(e.message));