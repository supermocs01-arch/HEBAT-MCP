// pine_replace4.cjs - execCommand insertText di textarea monaco (jalur input event asli)
const fs = require('fs');
const http = require('http');
const src = fs.readFileSync('C:/HEBAT/tradingview-mcp/scripts/current.pine', 'utf-8');

http.get('http://127.0.0.1:9222/json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    if (!t) { console.log('no chart'); process.exit(1); }
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) { return new Promise(r => { const mid = id++; const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); r(j.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); }); }
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      // 1) fokus + select all + replace via execCommand
      const r1 = await send('Runtime.evaluate', {
        expression: `(function(){
          var ed = document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];
          var ia = ed.querySelector('.inputarea');
          ia.focus();
          ia.select();
          document.execCommand('selectAll', false, null);
          return JSON.stringify({ sel: ia.selectionStart + '-' + ia.selectionEnd, len: ia.value.length });
        })()`,
        returnByValue: true
      });
      console.log('sel:', r1.result && r1.result.value);
      await sleep(400);
      // 2) insertText via execCommand (replace seleksi)
      const r2 = await send('Runtime.evaluate', {
        expression: `(function(){
          var ed = document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];
          var ia = ed.querySelector('.inputarea');
          ia.focus();
          var ok = document.execCommand('insertText', false, ${JSON.stringify(src)});
          return JSON.stringify({ ok: ok, len: ia.value.length });
        })()`,
        returnByValue: true
      });
      console.log('insert:', r2.result && r2.result.value);
      await sleep(1000);
      // 3) verifikasi ia.value
      const r3 = await send('Runtime.evaluate', {
        expression: `(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');var v=ia.value||'';return JSON.stringify({len:v.length, head:v.slice(0,50), tail:v.slice(-100), nl:(v.match(/\\n/g)||[]).length})})()`,
        returnByValue: true
      });
      console.log('after:', r3.result && r3.result.value);
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));