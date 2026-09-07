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
      await sleep(3000);
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
      await sleep(2500);
      const r2 = await send('Runtime.evaluate', {
        expression: `(function(){
          var swatches = [];
          document.querySelectorAll('[class*="swatch"]').forEach(function(s){
            if (s.offsetParent === null) return;
            var bg = (s.style && s.style.backgroundColor) || '';
            if (bg) {
              var rect = s.getBoundingClientRect();
              swatches.push({ x: rect.x + rect.width/2, y: rect.y + rect.height/2, bg: bg });
            }
          });
          return JSON.stringify(swatches.slice(0,8));
        })()`,
        returnByValue: true
      });
      const sw = JSON.parse(r2.result.value);
      console.log('SWATCHES:', JSON.stringify(sw));
      if (!sw.length) { process.exit(1); }
      const x = sw[0].x, y = sw[0].y;
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x, y: y, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x, y: y, button: 'left', clickCount: 1 });
      await sleep(2500);
      const r3 = await send('Runtime.evaluate', {
        expression: `(function(){
          var out = { inputs: [], wraps: [] };
          document.querySelectorAll('input').forEach(function(i){
            if (i.offsetParent === null) return;
            out.inputs.push({ type: i.type, val: (i.value||'').slice(0,30), cls: (i.className||'').toString().slice(0,60) });
          });
          document.querySelectorAll('[class*="colorPickerWrap"]').forEach(function(w){
            if (w.offsetParent === null) return;
            out.wraps.push((w.innerText||'').replace(/\\n/g,' | ').slice(0,100));
          });
          return JSON.stringify(out);
        })()`,
        returnByValue: true
      });
      console.log('POPUP2:', r3.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });