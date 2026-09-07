// read_full_editor.cjs - scroll editor ke atas lalu baca seluruh view-lines bertahap
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
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      // scroll ke paling atas
      const r0 = await send('Runtime.evaluate', {
        expression: `(function(){var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ov=ed.querySelector('.overflow-guard');if(ov)ov.scrollTop=0;var lines=ed.querySelectorAll('.view-line');var first=lines[0]?lines[0].textContent:'-';return {first:first, total:ov?ov.scrollHeight:0}})()`,
        returnByValue: true
      });
      console.log('top:', JSON.stringify(r0.result && r0.result.value));
      await sleep(600);
      // baca semua view-line yang tampil (viewport atas)
      const r1 = await send('Runtime.evaluate', {
        expression: `(function(){var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ls=ed.querySelectorAll('.view-line');var out=[];for(var i=0;i<ls.length;i++){out.push((i+1)+'|'+ls[i].textContent)}return out.join(String.fromCharCode(10))})()`,
        returnByValue: true
      });
      const val = r1.result && r1.result.value ? r1.result.value : '';
      const lines = val.split('\n');
      console.log('rendered:', lines.length);
      for (let i = 0; i < lines.length; i++) console.log(lines[i].slice(0, 160));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));