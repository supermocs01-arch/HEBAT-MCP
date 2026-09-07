// probe_dual_editor.cjs - bandingkan kedua editor pine: isi view-lines, visible, dimensi
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
          var eds = document.querySelectorAll('.monaco-editor.pine-editor-monaco');
          var out = [];
          for (var i=0;i<eds.length;i++) {
            var ed = eds[i];
            var rc = ed.getBoundingClientRect();
            var lines = ed.querySelectorAll('.view-line');
            var ln = ed.querySelectorAll('.line-numbers');
            var first = lines[0] ? lines[0].textContent : '';
            var firstNum = ln[0] ? ln[0].textContent : '';
            var canvas = ed.querySelectorAll('canvas').length;
            out.push({i:i, w:Math.round(rc.width), h:Math.round(rc.height), x:Math.round(rc.x), y:Math.round(rc.y),
              viewLines:lines.length, firstLine:first.slice(0,50), firstNum:firstNum, canvasCount:canvas,
              parent:(ed.parentElement.className||'').toString().slice(0,40),
              gp:(ed.parentElement.parentElement.className||'').toString().slice(0,40)});
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