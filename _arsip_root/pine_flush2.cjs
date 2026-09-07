// pine_flush2.cjs - insert source penuh dalam satu event setelah model = X, timeout besar
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
      return await evalJS(`(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ls=ed.querySelectorAll('.view-line');var nums=ed.querySelectorAll('.line-numbers');var out=[];for(var i=0;i<ls.length&&i<4;i++){var n=nums[i]?nums[i].textContent:'?';out.push(n+':'+ls[i].textContent.slice(0,30))}var ta=ed.querySelector('.inputarea');return JSON.stringify({lines:out,taLen:(ta.value||'').length})})()`);
    }
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      // state: model saat ini X (dari script sebelumnya yang timeout saat insert)
      const now = await viewTop();
      console.log('current model:', now);
      // jika model masih X -> insert full
      await send('Input.insertText', { text: src });
      console.log('insert sent, waiting 10s...');
      await sleep(10000);
      console.log('after insert:', await viewTop());
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));