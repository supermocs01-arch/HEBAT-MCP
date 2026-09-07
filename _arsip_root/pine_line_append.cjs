// pine_line6.cjs - append per-baris via insertText CDP, kursor di akhir model
const fs = require('fs');
const http = require('http');
const src = fs.readFileSync('C:/HEBAT/tradingview-mcp/scripts/current.pine', 'utf-8');
const lines = src.split('\n');

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
    async function evalJS(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      return r.result && r.result.value;
    }
    async function viewTop() {
      return await evalJS(`(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ls=ed.querySelectorAll('.view-line');var nums=ed.querySelectorAll('.line-numbers');var out=[];for(var i=0;i<ls.length&&i<5;i++){var n=nums[i]?nums[i].textContent:'?';out.push(n+':'+ls[i].textContent.slice(0,30))}var ta=ed.querySelector('.inputarea');return JSON.stringify({lines:out,ta:(ta.value||'').length})})()`);
    }
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      // fokus
      await evalJS(`(function(){var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');ia.focus();return 'focused'})()`);
      await sleep(300);
      // kosongkan: Ctrl+A, insert 'X', (model=X)
      await key(2, 'a', 'KeyA', 65); await sleep(400);
      await send('Input.insertText', { text: 'X' }); await sleep(400);
      await key(2, 'a', 'KeyA', 65); await sleep(300); // pilih X
      // sekarang insert baris pertama menggantikan X
      await send('Input.insertText', { text: lines[0] });
      await sleep(400);
      console.log('after line1:', await viewTop());
      // append baris 2.. dst dengan newline
      for (let i = 1; i < Math.min(lines.length, 130); i++) {
        const txt = (i === 1 ? '\n' + lines[i] : '\n' + lines[i]);
        await send('Input.insertText', { text: txt });
        await sleep(25);
      }
      await sleep(2000);
      console.log('after all:', await viewTop());
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));