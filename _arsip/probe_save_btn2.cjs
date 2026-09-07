// probe_save_btn2.cjs - cari tombol simpan dalam dialog pine editor
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
          var out = [];
          var btns = document.querySelectorAll('button');
          for (var i=0;i<btns.length;i++) {
            var b = btns[i];
            var txt = (b.textContent||'').trim();
            var title = b.getAttribute('title')||'';
            var aria = b.getAttribute('aria-label')||'';
            var cls = (b.className||'').toString();
            if (txt === 'Simpan' || txt === 'Publikasi' || /simpan/i.test(title) || /simpan/i.test(aria) || /update/i.test(title)) {
              out.push({txt: txt.slice(0,40), title: title.slice(0,40), aria: aria.slice(0,40), cls: cls.slice(0,40)});
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