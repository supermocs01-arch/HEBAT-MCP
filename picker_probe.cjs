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
      const r = await send('Runtime.evaluate', {
        expression: `(async function(){
          var sleep = function(ms){ return new Promise(function(res){ setTimeout(res,ms); }); };
          var swatches = [];
          document.querySelectorAll('[class*="swatch"]').forEach(function(s){ if (s.offsetParent !== null) swatches.push(s); });
          var sw = swatches[0];
          sw.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          sw.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          sw.click();
          await sleep(2500);
          var out = { inputs: [], classes: [] };
          document.querySelectorAll('input').forEach(function(i){
            if (i.offsetParent === null) return;
            out.inputs.push({ type: i.type, val: (i.value||'').slice(0,30), id: i.id||'', cls: (i.className||'').toString().slice(0,50), ar: i.getAttribute('aria-label')||'' });
          });
          document.querySelectorAll('[class*="picker" i], [class*="color" i]').forEach(function(el){
            if (el.offsetParent === null) return;
            var cls = (el.className||'').toString();
            if (/picker|color/i.test(cls)) out.classes.push(cls.slice(0,60));
          });
          return JSON.stringify(out);
        })()`,
        returnByValue: true,
        awaitPromise: true
      });
      console.log('PICKER:', r.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });