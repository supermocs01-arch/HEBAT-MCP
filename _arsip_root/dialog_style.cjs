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
          try { window.TradingViewApi._activeChartWidgetWV.value().executeActionById('chartProperties'); return 'ok'; } catch(e){ return 'ERR'; }
        })()`,
        returnByValue: true
      });
      await sleep(3000);
      const r2 = await send('Runtime.evaluate', {
        expression: `(function(){
          var out = { clicked: [] };
          var all = document.querySelectorAll('div, span, button, a');
          all.forEach(function(el){
            if (el.offsetParent === null) return;
            var tx = (el.innerText || '').trim();
            if (tx === 'Simbol' && el.children.length === 0) {
              el.click();
              out.clicked.push('Simbol');
            }
          });
          return JSON.stringify(out);
        })()`,
        returnByValue: true
      });
      console.log('click:', r2.result.value);
      await sleep(2500);
      const r3 = await send('Runtime.evaluate', {
        expression: `(function(){
          var out = [];
          var inp = document.querySelectorAll('input[type="text"], input');
          inp.forEach(function(i){
            if (i.offsetParent === null) return;
            var v = i.value || '';
            if (/^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/.test(v)) {
              var tr = i.closest('tr') || i.closest('div[class*="row"]') || i.parentElement;
              var lbl = tr ? (tr.innerText || '').slice(0,40).replace(/\\n/g,' ') : '';
              out.push({ v: v, lbl: lbl });
            }
          });
          return JSON.stringify(out.slice(0,20));
        })()`,
        returnByValue: true
      });
      console.log('INPUTS:', r3.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });