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
          var out = {};
          try {
            var wv = window.TradingViewApi._activeChartWidgetWV.value();
            var done = [];
            ['chartProperties','properties','showChartProperties'].forEach(function(aid){
              try { wv.executeActionById(aid); done.push(aid + ':OK'); } catch(e){ done.push(aid + ':ERR'); }
            });
            out.actions = done;
            return JSON.stringify(out);
          } catch(e){ return 'ERR: '+e.message; }
        })()`,
        returnByValue: true
      });
      console.log(r.result.value);
      await sleep(3000);
      const r2 = await send('Runtime.evaluate', {
        expression: `(function(){
          var dialogs = [];
          var all = document.querySelectorAll('div[role="dialog"], [class*="dialog"], [class*="Dialog"]');
          all.forEach(function(d){
            var t = (d.innerText || '').slice(0,120).replace(/\\n/g,' | ');
            if (t.indexOf('Properties')>=0 || t.indexOf('Style')>=0 || t.indexOf('Candles')>=0) {
              dialogs.push({ tag: d.tagName, cls: (d.className||'').toString().slice(0,80), text: t });
            }
          });
          var inputs = [];
          var inp = document.querySelectorAll('input[type="text"], input[type="color"], input');
          inp.forEach(function(i){
            var v = i.value || '';
            if (/^#?[0-9a-fA-F]{6}/.test(v) && (i.offsetParent !== null)) {
              var lbl = i.closest('tr, div, label') ? (i.closest('tr, div, label').innerText || '').slice(0,30) : '';
              inputs.push({ v: v, lbl: lbl.replace(/\\n/g,' '), cls: (i.className||'').toString().slice(0,40) });
            }
          });
          return JSON.stringify({ dialogs: dialogs.slice(0,3), colorInputs: inputs.slice(0,15) });
        })()`,
        returnByValue: true
      });
      console.log('DIALOG:', r2.result.value);
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });