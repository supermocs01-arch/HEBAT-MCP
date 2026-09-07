// pine_push_v2.cjs - inject kode Pine via CDP keyboard (fokus editor, select all, insert, save)
const fs = require('fs');
const http = require('http');
const SRC_PATH = 'C:/HEBAT/tradingview-mcp/scripts/current.pine';
const src = fs.readFileSync(SRC_PATH, 'utf-8');

http.get('http://127.0.0.1:9222/json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    if (!t) { console.log('no chart'); process.exit(1); }
    const WebSocket = require('ws');
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) { return new Promise(r => { const mid = id++; const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); r(j.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); }); }
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    ws.on('open', async () => {
      await send('Page.enable');
      await send('Runtime.enable');
      // 1) fokus ke editor monaco .inputarea
      const focus = await send('Runtime.evaluate', {
        expression: `(function(){var i=document.querySelector('.monaco-editor.pine-editor-monaco .inputarea')||document.querySelector('.monaco-editor.pine-editor-monaco textarea')||document.querySelector('.monaco-editor.pine-editor-monaco');if(i&&typeof i.focus==='function'){i.focus();return 'focused'}var iall=document.querySelectorAll('.monaco-editor .inputarea');if(iall.length){iall[0].focus();return 'focused ia'}return 'no target'})()`,
        returnByValue: true
      });
      console.log('focus:', focus.result ? focus.result.value : '-');
      await sleep(500);
      // 2) Ctrl+A
      await send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 2, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 2, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
      await sleep(400);
      // 3) insertText seluruh source
      await send('Input.insertText', { text: src });
      console.log('inserted:', src.length, 'chars');
      await sleep(800);
      // 4) Ctrl+S (save) — lalu compile via Add to Chart
      await send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 2, key: 's', code: 'KeyS', windowsVirtualKeyCode: 83 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 2, key: 's', code: 'KeyS', windowsVirtualKeyCode: 83 });
      await sleep(1500);
      // 5) coba klik tombol "Simpan & tambahkan ke chart"
      const click = await send('Runtime.evaluate', {
        expression: `(function(){var btns=document.querySelectorAll('button');for(var i=0;i<btns.length;i++){var t=(btns[i].textContent||'').trim();if(/simpan dan tambahkan/i.test(t)||/add to chart/i.test(t)||/perbarui/i.test(t)){btns[i].click();return t}}return null})()`,
        returnByValue: true
      });
      console.log('compile btn:', JSON.stringify(click.result && click.result.value));
      await sleep(2500);
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));

function log(m){ console.log(m); }