// pine_final.cjs - BERSIH: Ctrl+A->X->Ctrl+A, lalu chunk 380 berurutan (tanpa End, append alami)
const fs = require('fs');
const http = require('http');
const src = fs.readFileSync('C:/HEBAT/tradingview-mcp/scripts/current.pine', 'utf-8');
const CH = 380;

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
    async function modelInfo() {
      return await evalJS(`(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ls=ed.querySelectorAll('.view-line');var nums=ed.querySelectorAll('.line-numbers');var last=nums[nums.length-1]?nums[nums.length-1].textContent:'?';return JSON.stringify({firstLineN:nums[0]?nums[0].textContent:'?',lastLineN:last,firstTxt:ls[0]?ls[0].textContent.slice(0,40):''})})()`);
    }
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      await evalJS(`(function(){var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');ia.focus();return 'focused'})()`);
      await sleep(300);
      // 1) Ctrl+A select all
      await key(2, 'a', 'KeyA', 65); await sleep(400);
      // 2) X menggantikan seluruh model
      await send('Input.insertText', { text: 'X' }); await sleep(500);
      console.log('step1 X:', await modelInfo());
      // 3) Ctrl+A pilih X
      await key(2, 'a', 'KeyA', 65); await sleep(300);
      // 4) chunk berurutan — append di posisi kursor (akhir 'X' selection diganti chunk1, lalu append)
      for (let i = 0; i < src.length; i += CH) {
        await send('Input.insertText', { text: src.slice(i, i + CH) });
        await sleep(450);
        if (i % (CH*5) === 0) console.log('  progress', Math.min(i + CH, src.length));
      }
      await sleep(2000);
      console.log('FINAL:', await modelInfo());
      // verifikasi tail: Ctrl+End lalu baca baris terakhir
      await key(2, 'End', 'End', 35); await sleep(800);
      const tail = await evalJS(`(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ls=ed.querySelectorAll('.view-line');var nums=ed.querySelectorAll('.line-numbers');var out=[];for(var i=Math.max(0,ls.length-3);i<ls.length;i++){var n=nums[i]?nums[i].textContent:'?';out.push(n+':'+ls[i].textContent.slice(0,60))}return JSON.stringify(out)})()`);
      console.log('TAIL:', tail);
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));