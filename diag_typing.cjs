// diag_typing.cjs - tes apakah keyboard sampai ke editor monaco
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
      const r0 = await send('Runtime.evaluate', {
        expression: `(function(){var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');ia.focus();return 'focused'})()`,
        returnByValue: true
      });
      console.log('0:', r0.result && r0.result.value);
      // kirim 'X' via insertText (tanpa seleksi)
      await send('Input.insertText', { text: 'X' });
      await sleep(600);
      // baca baris 1 (harusnya mulai dengan 'X' kalau kursor di awal)
      const r1 = await send('Runtime.evaluate', {
        expression: `(function(){var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ls=ed.querySelectorAll('.view-line');var nums=ed.querySelectorAll('.line-numbers');var out=[];for(var i=0;i<ls.length&&i<6;i++){var n=nums[i]?nums[i].textContent:'?';out.push(n+'|'+JSON.stringify(ls[i].textContent.slice(0,60)))}return JSON.stringify(out)})()`,
        returnByValue: true
      });
      console.log(r1.result && r1.result.value ? r1.result.value : '-');
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));