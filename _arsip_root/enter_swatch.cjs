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
          document.querySelectorAll('div, span, button, a').forEach(function(el){
            if (el.offsetParent === null || c>0) return;
            if ((el.innerText||'').trim() === 'Simbol' && el.children.length === 0) { el.click(); c++; }
          });
          return 'menu:'+c;
        })()`,
        returnByValue: true
      });
      await sleep(2500);
      const r2 = await send('Runtime.evaluate', {
        expression: `(function(){
          var s = [];
          document.querySelectorAll('[data-name="color-select"]').forEach(function(w){
            if (w.offsetParent !== null) s.push(w);
          });
          if (s.length) s[0].focus();
          return 'focus:' + s.length;
        })()`,
        returnByValue: true
      });
      console.log(r2.result.value);
      await sleep(300);
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
      await sleep(2500);
      const r3 = await send('Runtime.evaluate', {
        expression: `(function(){
          var found = [];
          document.querySelectorAll('*').forEach(function(el){
            if (el.offsetParent === null) return;
            var cls = (el.className || '').toString();
            if (el === document.body) return;
            if (/picker|dialog/i.test(cls) && /dialog/i.test(cls)) found.push(cls.slice(0,80));
            if (/hex/i.test(cls)) found.push('HEX:' + cls.slice(0,80));
            if (el.tagName === 'INPUT' && /color|hex/i.test((el.className||'').toString())) found.push('IN:' + el.className.slice(0,60));
          });
          return JSON.stringify(Array.from(new Set(found)).slice(0,20));
        })()`,
        returnByValue: true
      });
      console.log('AFTER-ENTER:', r3.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });