// read_full_editor2.cjs - fokus editor, key Home (ke awal), lalu baca viewport bertahap sambil scroll
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
    async function key(mod, key, code, vk) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: mod, key, code, windowsVirtualKeyCode: vk });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: mod, key, code, windowsVirtualKeyCode: vk });
    }
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      const r0 = await send('Runtime.evaluate', {
        expression: `(function(){var ed=document.querySelector('.monaco-editor.pine-editor-monaco');var ia=ed.querySelector('.inputarea')||ed.querySelector('textarea');if(ia)ia.focus();return 'focused'})()`,
        returnByValue: true
      });
      console.log('0:', r0.result && r0.result.value);
      // Ctrl+Home ke baris 1 kolom 1
      await key(2, 'Home', 'Home', 36);
      await sleep(500);
      const r1 = await send('Runtime.evaluate', {
        expression: `(function(){var ed=document.querySelector('.monaco-editor.pine-editor-monaco');var ls=ed.querySelectorAll('.view-line');var out=[];for(var i=0;i<ls.length&&i<40;i++){out.push((i+1)+'|'+ls[i].textContent)}return out.join(String.fromCharCode(10))})()`,
        returnByValue: true
      });
      console.log(r1.result && r1.result.value ? r1.result.value : '-');
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));