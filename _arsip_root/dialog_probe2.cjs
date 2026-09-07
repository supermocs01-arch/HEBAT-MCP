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
        expression: `(function(){ var wv = window.TradingViewApi._activeChartWidgetWV.value(); try { wv.executeActionById('chartProperties'); return 'opened'; } catch(e){ return 'ERR '+e.message; } })()`,
        returnByValue: true
      });
      console.log('action sent');
      await sleep(5000);
      const r2 = await send('Runtime.evaluate', {
        expression: `(function(){
          var out = { btns: [], inputs: [] };
          var btns = document.querySelectorAll('button, [role="button"]');
          var vis = function(el){ return el.offsetParent !== null; };
          btns.forEach(function(b){
            if (!vis(b)) return;
            var tx = (b.innerText || '').trim().slice(0,40);
            if (tx) out.btns.push(tx);
          });
          var inp = document.querySelectorAll('input');
          inp.forEach(function(i){
            if (!vis(i)) return;
            out.inputs.push({ type: i.type, val: (i.value||'').slice(0,40), cls: (i.className||'').toString().slice(0,50) });
          });
          out.visibleCount = { btns: out.btns.length, inputs: out.inputs.length };
          return JSON.stringify(out);
        })()`,
        returnByValue: true
      });
      console.log('DOM:', r2.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });