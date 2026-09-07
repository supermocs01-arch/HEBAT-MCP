// open_pine_editor.cjs - buka panel Pine Editor TV lalu verifikasi monaco muncul
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
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    async function evalJS(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }); return r.result && r.result.value; }
    ws.on('open', async () => {
      await send('Runtime.enable');
      // 1) status monaco sekarang
      const before = await evalJS(`(()=>{var e=document.querySelectorAll('.monaco-editor.pine-editor-monaco');return 'monaco:'+e.length})()`);
      console.log('sebelum:', before);
      // 2) cari elemen "Pine Editor" yang bisa diklik
      const found = await evalJS(`(function(){
        var cands=[];
        var all=document.querySelectorAll('button,div[role="tab"],span,div[class*="tabs"] div');
        for(var i=0;i<all.length;i++){
          var el=all[i]; var txt=(el.textContent||'').trim();
          if(txt==='Pine Editor'||txt==='Pine editor'){var r=el.getBoundingClientRect(); if(r.width>0&&r.height>0&&r.height<60) cands.push({tag:el.tagName,cls:(el.className||'').toString().slice(0,60),txt:txt});}
        }
        return JSON.stringify(cands.slice(0,5));
      })()`);
      console.log('kandidat:', found);
      // 3) klik kandidat pertama
      const clicked = await evalJS(`(function(){
        var all=document.querySelectorAll('button,div[role="tab"],span,div[class*="tabs"] div');
        for(var i=0;i<all.length;i++){
          var el=all[i]; var txt=(el.textContent||'').trim();
          if(txt==='Pine Editor'||txt==='Pine editor'){var r=el.getBoundingClientRect(); if(r.width>0&&r.height>0&&r.height<60){el.click();return 'clicked: '+txt;}}
        }
        return 'not found';
      })()`);
      console.log('klik:', clicked);
      await sleep(2500);
      // 4) coba juga via chartWidget action id kalau masih belum muncul
      let after = await evalJS(`(()=>{var e=document.querySelectorAll('.monaco-editor.pine-editor-monaco');return 'monaco:'+e.length})()`);
      console.log('sesudah klik:', after);
      if (after === 'monaco:0') {
        const act = await evalJS(`(function(){try{var wv=window.TradingViewApi._activeChartWidgetWV.value();var cw=wv._chartWidget;var ids=['pineEditor','openPineEditor','showPineEditor','togglePineEditor'];for(var i=0;i<ids.length;i++){try{cw.executeActionById(ids[i]);return 'exec:'+ids[i]}catch(e){}}return 'no action id';}catch(e){return 'ERR '+e.message}})()`);
        console.log('action:', act);
        await sleep(2500);
        after = await evalJS(`(()=>{var e=document.querySelectorAll('.monaco-editor.pine-editor-monaco');return 'monaco:'+e.length})()`);
        console.log('sesudah action:', after);
      }
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));
