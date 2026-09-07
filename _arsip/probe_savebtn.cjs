// probe_savebtn.cjs - cari semua tombol di editor pine + isi editor via monaco getValue
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
      // isi editor via DOM textarea.value? .view-lines text?
      const r1 = await send('Runtime.evaluate', {
        expression: `JSON.stringify((function(){
          var out = {titles:[], dataNames:[], clicked:null};
          var all = document.querySelectorAll('[title],[aria-label],[data-name]');
          for (var i=0;i<all.length;i++) {
            var t = (all[i].getAttribute('title')||'').trim();
            var a = (all[i].getAttribute('aria-label')||'').trim();
            var dn = (all[i].getAttribute('data-name')||'').trim();
            var label = t || a || dn;
            if (/simpan|save|tambah|add|chart/i.test(label)) {
              out.titles.push(label.slice(0,60));
              if (!out.clicked && all[i].tagName==='BUTTON') { all[i].click(); out.clicked = label.slice(0,60); }
            }
          }
          return out;
        })())`,
        returnByValue: true
      });
      console.log(r1.result && r1.result.value ? r1.result.value : JSON.stringify(r1.result));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));