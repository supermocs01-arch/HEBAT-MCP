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
      const r = await send('Runtime.evaluate', {
        expression: `(async function(){
          var sleep = function(ms){ return new Promise(function(res){ setTimeout(res,ms); }); };
          var out = [];
          var setHex = function(inp, hex){
            var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(inp, hex);
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
          };
          var clickSwatch = function(sw){
            sw.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            sw.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            sw.click();
          };
          var findHexInput = function(){
            var inp = document.querySelectorAll('input');
            for (var i=0;i<inp.length;i++){
              var v = inp[i].value || '';
              if (/^#?[0-9a-fA-F]{6}$/.test(v) && inp[i].offsetParent !== null) return inp[i];
            }
            return null;
          };
          var swatches = [];
          var all = document.querySelectorAll('[class*="swatch"]');
          all.forEach(function(s){ if (s.offsetParent !== null) swatches.push(s); });
          if (!swatches.length) return 'no swatches';
          for (var i=0;i<swatches.length && i<6;i++){
            var sw = swatches[i];
            clickSwatch(sw);
            await sleep(900);
            var inp = findHexInput();
            if (!inp) { out.push('sw'+i+':no-input'); continue; }
            var target = i % 2 === 0 ? '#ffffff' : '#000000';
            setHex(inp, target);
            await sleep(400);
            inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            await sleep(800);
            out.push('sw'+i+':set ' + target);
          }
          return out.join(' | ');
        })()`,
        returnByValue: true,
        awaitPromise: true
      });
      console.log('SET:', r.result.value);
      await sleep(1500);
      const r2 = await send('Runtime.evaluate', {
        expression: `(function(){
          var btns = document.querySelectorAll('button, div[role="button"]');
          var ok = null;
          btns.forEach(function(b){
            if (b.offsetParent !== null && !ok) {
              var tx = (b.innerText || '').trim();
              if (tx === 'Ok' || tx === 'OK') ok = b;
            }
          });
          if (ok) { ok.click(); return 'OK clicked'; }
          return 'OK not found';
        })()`,
        returnByValue: true
      });
      console.log('SAVE:', r2.result.value);
      await sleep(2000);
      const r3 = await send('Runtime.evaluate', {
        expression: `(function(){
          var pv = window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.model().m_model.mainSeries()._paneView;
          var bars = pv._bars;
          if (!bars || !bars.length) return 'no bars';
          var b = bars[bars.length-1];
          return JSON.stringify({ color: b.color, border: b.borderColor });
        })()`,
        returnByValue: true
      });
      console.log('BAR:', r3.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });