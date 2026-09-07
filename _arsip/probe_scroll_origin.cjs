// probe_scroll_origin.cjs - cari scroll container monaco yang benar
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
          var ed = document.querySelector('.monaco-editor.pine-editor-monaco');
          if (!ed) return {err:'no editor'};
          var all = ed.querySelectorAll('*');
          var out = [];
          for (var i=0;i<all.length;i++) {
            var el = all[i];
            if (el.scrollHeight > el.clientHeight + 10 || el.scrollTop !== 0 || /scroll|lines-content|overflow/.test(el.className||'')) {
              out.push({cls:(el.className||'').toString().slice(0,50), sh:el.scrollHeight, ch:el.clientHeight, st:el.scrollTop, lines:el.querySelectorAll('.view-line').length});
            }
          }
          return out;
        })())`,
        returnByValue: true
      });
      console.log(r.result && r.result.value ? r.result.value : JSON.stringify(r.result));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));