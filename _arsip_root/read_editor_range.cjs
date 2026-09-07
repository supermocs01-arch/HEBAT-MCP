// read_editor_range.cjs - baca baris 25-45 editor index 1
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
          var ed = document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1] || document.querySelectorAll('.monaco-editor.pine-editor-monaco')[0];
          if (!ed) return {err:'no ed'};
          var ls = ed.querySelectorAll('.view-line');
          var nums = ed.querySelectorAll('.line-numbers');
          var out = [];
          for (var i=0;i<ls.length;i++) {
            var n = nums[i] ? nums[i].textContent : String(i+1);
            var nv = parseInt(n,10);
            if (!isNaN(nv) && nv >= 25 && nv <= 45) {
              var ln = ls[i].textContent;
              out.push(nv + '|' + JSON.stringify(ln));
            }
          }
          return out;
        })())`,
        returnByValue: true
      });
      const val = r.result && r.result.value;
      if (val) { try { JSON.parse(val).forEach(x => console.log(x)); } catch(e) { console.log(val); } }
      else console.log('-');
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));