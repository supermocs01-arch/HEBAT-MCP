// pine_replace7.cjs - resep: kosongkan (X->hapus), Ctrl+End, ketik chunk berurutan
const fs = require('fs');
const http = require('http');
const src = fs.readFileSync('C:/HEBAT/tradingview-mcp/scripts/current.pine', 'utf-8');
const CHUNK = 200;

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
    function stateExpr(obj) {
      return obj.map(function(x) {
        return { len: (x.value||'').length, sel: x.selectionStart + '-' + x.selectionEnd,
                 head: (x.value||'').slice(0,40), nl: ((x.value||'').match(/\n/g)||[]).length };
      });
    }
    async function evalJS(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      return r.result && r.result.value;
    }
    async function getReport() {
      return await evalJS(`(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');var v=ia.value||'';return JSON.stringify({len:v.length,sel:ia.selectionStart+'-'+ia.selectionEnd,head:v.slice(0,40),tail:v.slice(-50),nl:(v.match(/\\n/g)||[]).length})})()`);
    }
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      // 1) fokus editor [1]
      await evalJS(`(function(){var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');ia.focus();return 'focused'})()`);
      await sleep(300);
      // 2) Ctrl+A lalu ketik 'X' (model jadi 1 char) — VERIFIKASI model ter-update
      await key(2, 'a', 'KeyA', 65); await sleep(400);
      await send('Input.insertText', { text: 'X' }); await sleep(400);
      console.log('step1 X:', await getReport());
      // 3) Ctrl+A pilih X, Backspace hapus -> model kosong
      await key(2, 'a', 'KeyA', 65); await sleep(300);
      await key(0, 'Backspace', 'Backspace', 8); await sleep(500);
      console.log('step2 kosong:', await getReport());
      // 4) Ctrl+End -> kursor ke akhir (pos 0 utk kosong)
      await key(2, 'End', 'End', 35); await sleep(400);
      console.log('step3 end:', await getReport());
      // 5) ketik chunk berurutan
      let total = 0;
      for (let i = 0; i < src.length; i += CHUNK) {
        const part = src.slice(i, i + CHUNK);
        await send('Input.insertText', { text: part });
        await sleep(400);
        total = Math.min(i + CHUNK, src.length);
        if (i % (CHUNK*5) === 0) console.log('  progress', total + '/' + src.length);
      }
      await sleep(1500);
      const final = await getReport();
      const o = JSON.parse(final);
      console.log('final:', o.len + ' | expected ' + src.length + ' | sel ' + o.sel + ' | nl=' + o.nl);
      console.log('head:', o.head);
      console.log('tail:', o.tail);
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));