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
        expression: `(function(){ try { window.TradingViewApi._activeChartWidgetWV.value().executeActionById('chartProperties'); return 'ok'; } catch(e){ return 'ERR'; } })()`,
        returnByValue: true
      });
      await sleep(3500);
      await send('Runtime.evaluate', {
        expression: `(function(){
          var c=0;
          var all = document.querySelectorAll('div, span, button, a');
          all.forEach(function(el){
            if (el.offsetParent === null || c>0) return;
            var tx = (el.innerText || '').trim();
            if (tx === 'Simbol' && el.children.length === 0) { el.click(); c++; }
          });
          return 'clicked:'+c;
        })()`,
        returnByValue: true
      });
      await sleep(4000);
      const r3 = await send('Runtime.evaluate', {
        expression: `(function(){
          var out = { hex: [], sw: [], rows: [] };
          var inp = document.querySelectorAll('input[type="text"], input');
          inp.forEach(function(i){
            if (i.offsetParent === null) return;
            var v = i.value || '';
            if (/^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(v)) {
              var tr = i.closest('tr') || i.parentElement.parentElement;
              var lbl = tr ? (tr.innerText || '').replace(/\\n/g,' ').slice(0,40) : '';
              out.hex.push({ v: v, lbl: lbl });
            }
          });
          var sw = document.querySelectorAll('div[style*="background"], [class*="swatch" i]');
          sw.forEach(function(s){
            if (s.offsetParent === null) return;
            var bg = (s.style && s.style.backgroundColor) || '';
            var lbl = (s.innerText||'').slice(0,20);
            if (bg || s.className) out.sw.push({ bg: bg, cls: (s.className||'').toString().slice(0,40) });
          });
          var body = document.body.innerText || '';
          var idx = body.indexOf('Warna');
          out.snippet = idx>=0 ? body.slice(idx, idx+300).replace(/\\n/g,' | ') : 'tidak ada kata Warna';
          return JSON.stringify(out);
        })()`,
        returnByValue: true
      });
      console.log('FIND:', r3.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });