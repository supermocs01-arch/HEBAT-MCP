// focus_verify.cjs - fokus editor [1], lalu verifikasi document.activeElement
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
        expression: `(function(){
          var ed = document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1] || document.querySelectorAll('.monaco-editor.pine-editor-monaco')[0];
          var ia = ed.querySelector('.inputarea') || ed.querySelector('textarea');
          ia.focus();
          var ae = document.activeElement;
          var out = {
            activeTag: ae ? ae.tagName : 'none',
            activeCls: ae ? (ae.className || '').toString().slice(0,60) : '',
            isInputarea: ae === ia,
            isInsideEd: ae ? ed.contains(ae) : false,
            nEditors: document.querySelectorAll('.monaco-editor.pine-editor-monaco').length
          };
          return JSON.stringify(out);
        })()`,
        returnByValue: true
      });
      console.log(r.result && r.result.value ? r.result.value : JSON.stringify(r.result));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));