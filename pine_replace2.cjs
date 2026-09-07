// pine_replace2.cjs - REPLACE via mouse click + Ctrl+A + Delete + insert
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
    async function key(mod, key, code, vk, text) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: mod, key, code, windowsVirtualKeyCode: vk, text: text || '' });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: mod, key, code, windowsVirtualKeyCode: vk });
    }
    async function mouseClick(x, y) {
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    }

    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      // 1) klik di tengah editor (index 1: x 804-1516, y 110-803)
      await mouseClick(804 + 356, 110 + 300);
      await sleep(500);
      // 2) Ctrl+A
      await key(2, 'a', 'KeyA', 65);
      await sleep(400);
      // 3) Delete
      await key(0, 'Delete', 'Delete', 46);
      await sleep(700);
      // 4) verifikasi kosong
      const r2 = await send('Runtime.evaluate', {
        expression: `(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1]||document.querySelectorAll('.monaco-editor.pine-editor-monaco')[0];if(!ed)return {len:-1};var ls=ed.querySelectorAll('.view-line');var txt='';for(var i=0;i<ls.length;i++)txt+=ls[i].textContent;return {len:txt.length,first:ls[0]?ls[0].textContent:''}})()`,
        returnByValue: true
      });
      console.log('after delete:', JSON.stringify(r2.result && r2.result.value));
      // 5) insert source
      await send('Input.insertText', { text: src });
      await sleep(1200);
      const r3 = await send('Runtime.evaluate', {
        expression: `(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1]||document.querySelectorAll('.monaco-editor.pine-editor-monaco')[0];if(!ed)return {len:-1};var ls=ed.querySelectorAll('.view-line');var txt='';for(var i=0;i<ls.length;i++)txt+=ls[i].textContent+'\\n';return {len:txt.length,head:txt.slice(0,50),tail:txt.slice(-100)}})()`,
        returnByValue: true
      });
      console.log('after insert:', JSON.stringify(r3.result && r3.result.value));
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));