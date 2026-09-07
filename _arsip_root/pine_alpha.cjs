// pine_alpha.cjs - verified flow: Ctrl+A -> X (model=X) -> Ctrl+A -> insert src -> tunggu
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
    async function evalJS(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      return r.result && r.result.value;
    }
    async function viewTop() {
      return await evalJS(`(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ls=ed.querySelectorAll('.view-line');var nums=ed.querySelectorAll('.line-numbers');var out=[];for(var i=0;i<ls.length&&i<3;i++){var n=nums[i]?nums[i].textContent:'?';out.push(n+':'+ls[i].textContent.slice(0,30))}var ta=ed.querySelector('.inputarea');return JSON.stringify({lines:out,ta:(ta.value||'').length})})()`);
    }
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      await evalJS(`(function(){var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');ia.focus();return 'focused'})()`);
      await sleep(300);
      // 1) Ctrl+A (select all)
      await key(2, 'a', 'KeyA', 65); await sleep(600);
      // 2) insert X -> harus model=X
      await send('Input.insertText', { text: 'X' }); await sleep(800);
      const s1 = await viewTop();
      console.log('step1:', s1);
      const o1 = JSON.parse(s1);
      o1.out = o1.out || o1.lines;
      if (o1.out[0] !== '1:X') {
        console.log('ABORT step1 tidak = X:', o1.out[0]);
        process.exit(1);
      }
      // 3) Ctrl+A (pilih X)
      await key(2, 'a', 'KeyA', 65); await sleep(500);
      // 4) insert FULL source
      await send('Input.insertText', { text: src });
      console.log('insert sent, wait 60s');
      await sleep(60000);
      console.log('final:', await viewTop());
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));