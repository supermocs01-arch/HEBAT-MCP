// pine_replace3.cjs - jalur textarea: fokus, Ctrl+A, Delete, insertText, verifikasi ia.value
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
    async function key(mod, key, code, vk) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: mod, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, location: 1, autoRepeat: false, isKeypad: false, isSystemKey: false });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: mod, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, location: 1, autoRepeat: false, isKeypad: false, isSystemKey: false });
    }
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      // 1) fokus
      await send('Runtime.evaluate', {
        expression: `(function(){var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');ia.focus();return 'focused'})()`,
        returnByValue: true
      });
      await sleep(300);
      // 2) Ctrl+A
      await key(2, 'a', 'KeyA', 65);
      await sleep(500);
      // 3) Delete
      await key(0, 'Delete', 'Delete', 46);
      await sleep(700);
      // 4) verifikasi kosong via ia.value
      const r2 = await send('Runtime.evaluate', {
        expression: `(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');return {len:ia.value.length, head:ia.value.slice(0,30)}})()`,
        returnByValue: true
      });
      console.log('after delete:', JSON.stringify(r2.result && r2.result.value));
      // 5) insertText
      await send('Input.insertText', { text: src });
      await sleep(1200);
      // 6) verifikasi ia.value
      const r3 = await send('Runtime.evaluate', {
        expression: `(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');var v=ia.value||'';return {len:v.length, head:v.slice(0,50), tail:v.slice(-100), nl:(v.match(/\\n/g)||[]).length}})()`,
        returnByValue: true
      });
      console.log('after insert:', JSON.stringify(r3.result && r3.result.value));
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));