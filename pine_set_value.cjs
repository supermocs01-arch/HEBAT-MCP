// pine_set_value.cjs - set ia.value + dispatch input event trusted
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
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      const r = await send('Runtime.evaluate', {
        expression: `(function(){
          var ed = document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1] || document.querySelectorAll('.monaco-editor.pine-editor-monaco')[0];
          var ia = ed.querySelector('.inputarea') || ed.querySelector('textarea');
          ia.focus();
          ia.select();
          var ok = document.execCommand('insertText', false, ${JSON.stringify(src)});
          // juga dispatch InputEvent
          var ev = new Event('input', { bubbles: true });
          ia.dispatchEvent(ev);
          return JSON.stringify({ ok: ok, len: ia.value.length });
        })()`,
        returnByValue: true
      });
      console.log('insert:', r.result && r.result.value);
      await new Promise(r => setTimeout(r, 1200));
      const r2 = await send('Runtime.evaluate', {
        expression: `(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1]||document.querySelectorAll('.monaco-editor.pine-editor-monaco')[0];var ia=ed.querySelector('.inputarea');var v=ia.value||'';return JSON.stringify({len:v.length,head:v.slice(0,40),nl:(v.match(/\\n/g)||[]).length})})()`,
        returnByValue: true
      });
      console.log('after:', r2.result && r2.result.value);
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));