// check_pine_errors.cjs - baca error marker Pine
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
          var all = document.querySelectorAll('.monaco-editor.pine-editor-monaco .view-lines .view-line');
          var m = document.querySelectorAll('.monaco-editor.pine-editor-monaco .squiggly-error, .monaco-editor.pine-editor-monaco .glyph-margin-widgets, .monaco-editor.pine-editor-monaco .markersOverlay');
          out.push('squigly:'+m.length);
          var ov = document.querySelectorAll('.monaco-editor.pine-editor-monaco .overflowingContentWidgets [class*=error]');
          out.push('widgets:'+ov.length);
          for (var i=0;i<Math.min(ov.length,5);i++) out.push('W:'+(ov[i].textContent||'').slice(0,120));
          return out;
        })())`,
        returnByValue: true
      });
      console.log(r.result && r.result.value ? r.result.value : JSON.stringify(r.result));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));