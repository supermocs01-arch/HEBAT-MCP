// pine_replace6.cjs - insertText dalam chunk kecil berurutan (monaco batas ~500 char)
const fs = require('fs');
const http = require('http');
const src = fs.readFileSync('C:/HEBAT/tradingview-mcp/scripts/current.pine', 'utf-8');
const CHUNK = 300;

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
    async function getLen() {
      const r = await send('Runtime.evaluate', {
        expression: `(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');return (ia.value||'').length})()`,
        returnByValue: true
      });
      return r.result && r.result.value;
    }
    async function getText() {
      const r = await send('Runtime.evaluate', {
        expression: `(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');return (ia.value||'')})()`,
        returnByValue: true
      });
      return r.result && r.result.value;
    }
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      // 1) fokus + Ctrl+A + ketik X (kosongkan, model jadi 1 char)
      await send('Runtime.evaluate', {
        expression: `(function(){var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');ia.focus();return 'focused'})()`,
        returnByValue: true
      });
      await sleep(300);
      await key(2, 'a', 'KeyA', 65);
      await sleep(400);
      await send('Input.insertText', { text: 'X' });
      await sleep(500);
      console.log('after X (model=1):', await getText());

      // 2) Ctrl+A (pilih X)
      await key(2, 'a', 'KeyA', 65);
      await sleep(300);

      // 3) tulis chunk berurutan
      for (let i = 0; i < src.length; i += CHUNK) {
        const part = src.slice(i, i + CHUNK);
        await send('Input.insertText', { text: part });
        await sleep(120);
      }
      await sleep(1500);
      const final = await getText();
      console.log('final len:', final, '| expected:', src.length);
      const r2 = await send('Runtime.evaluate', {
        expression: `(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');var v=ia.value||'';return JSON.stringify({head:v.slice(0,50), tail:v.slice(-80), nl:(v.match(/\\n/g)||[]).length})})()`,
        returnByValue: true
      });
      console.log(r2.result && r2.result.value);
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));