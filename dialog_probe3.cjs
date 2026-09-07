const http = require('http');
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p) => new Promise(r => { const mid = id++; const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); r(j.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); });
    ws.on('open', async () => {
      await send('Runtime.enable');
      const r2 = await send('Runtime.evaluate', {
        expression: `(function(){
          var out = { inputs: [], swatches: [] };
          var inp = document.querySelectorAll('input');
          inp.forEach(function(i){
            if (i.offsetParent === null) return;
            out.inputs.push({ type: i.type, val: (i.value||'').slice(0,30), id: i.id || '', name: i.name || '' });
          });
          var sw = document.querySelectorAll('[class*="color" i], [class*="swatch" i], [data-name*="color" i]');
          sw.forEach(function(s){
            if (s.offsetParent === null) return;
            var bg = s.style && s.style.backgroundColor;
            var lbl = (s.getAttribute && s.getAttribute('data-name')) || (s.className||'').toString().slice(0,40);
            if (bg || /color/i.test(lbl)) out.swatches.push({ lbl: lbl.slice(0,50), bg: bg || '' });
          });
          var text = document.body.innerText || '';
          out.hasStyle = text.indexOf('Style') >= 0;
          out.hasWarna = text.indexOf('Warna') >= 0;
          return JSON.stringify(out);
        })()`,
        returnByValue: true
      });
      console.log('DOM2:', r2.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });