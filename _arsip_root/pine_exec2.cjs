// pine_exec_full.cjs - execCommand selectAll+insertText src di textarea, lalu VERIFIKASI view-lines model
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
    async function evalJS(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      return r.result && r.result.value;
    }
    async function viewRows() {
      return await evalJS(`(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ls=ed.querySelectorAll('.view-line');var nums=ed.querySelectorAll('.line-numbers');var out=[];for(var i=0;i<ls.length&&i<36;i++){out.push((nums[i]?nums[i].textContent:'?')+':'+ls[i].textContent.slice(0,45))}return JSON.stringify(out)})()`);
    }
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      const r = await send('Runtime.evaluate', {
        expression: `(function(){
          var ed = document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1] || document.querySelectorAll('.monaco-editor.pine-editor-monaco')[0];
          var ia = ed.querySelector('.inputarea') || ed.querySelector('textarea');
          ia.focus();
          ia.select();
          document.execCommand('selectAll', false, null);
          var ok = document.execCommand('insertText', false, ${JSON.stringify(src)});
          return JSON.stringify({ ok: ok, taLen: ia.value.length });
        })()`,
        returnByValue: true
      });
      console.log('exec:', JSON.stringify(r.result && r.result.value));
      await sleep(4000);
      console.log('VIEW TOP:', await viewRows());
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));