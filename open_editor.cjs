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
      const r1 = await send('Runtime.evaluate', { expression: '(function(){var els=document.querySelectorAll("button[data-name=pine-dialog-button]");if(els.length){els[0].click();return "clicked"}return "not found"})()', returnByValue: true });
      console.log('1:', r1.result ? r1.result.value : '-');
      await new Promise(r => setTimeout(r, 6000));
      const r2 = await send('Runtime.evaluate', { expression: '(function(){var el=document.querySelector(".monaco-editor.pine-editor-monaco");return el?"editor open":"editor closed"})()', returnByValue: true });
      console.log('2:', r2.result ? r2.result.value : '-');
      await new Promise(r => setTimeout(r, 6000));
      process.exit(0);
    });
  });
}).on('error', e => console.log(e.message));