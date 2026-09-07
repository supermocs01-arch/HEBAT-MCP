// probe_legend_dom.cjs - cari "SMC" di seluruh DOM chart + status bar editor
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
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      const r = await send('Runtime.evaluate', {
        expression: `JSON.stringify((function(){
          var out = {smcHits: [], editorOpen: false, compStatus: []};
          try {
            var all = document.querySelectorAll('div,span,button,table');
            for (var i=0;i<all.length;i++) {
              var t = all[i].textContent || '';
              if (/SMC SWING PATEN/i.test(t)) {
                out.smcHits.push({tag: all[i].tagName, cls: (all[i].className||'').toString().slice(0,60), txt: t.trim().slice(0,100)});
                if (out.smcHits.length > 5) break;
              }
            }
            var editors = document.querySelectorAll('.monaco-editor.pine-editor-monaco');
            out.editorOpen = editors.length > 0;
            var sb = document.querySelectorAll('.pine-editor-compile-status, [class*=compile-status], [class*=pine-status]');
            for (var j=0;j<sb.length;j++) out.compStatus.push((sb[j].textContent||'').trim().slice(0,80));
          } catch(e) { out.err = e.message; }
          return out;
        })())`,
        returnByValue: true
      });
      console.log(r.result && r.result.value ? r.result.value : JSON.stringify(r.result));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));