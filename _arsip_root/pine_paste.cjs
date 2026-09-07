// pine_paste.cjs - copy source ke clipboard (execCommand copy) lalu Ctrl+V ke editor
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
    async function getReport() {
      return await evalJS(`(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');var v=ia.value||'';return JSON.stringify({len:v.length,head:v.slice(0,40),tail:v.slice(-50),nl:(v.match(/\\n/g)||[]).length})})()`);
    }
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      await send('Browser.grantPermissions', { origin: t.url, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] }).catch(()=>{});
      // 1) copy source ke clipboard via textarea sementara
      const cp = await evalJS(`(function(){
        var ta = document.createElement('textarea');
        ta.value = ${JSON.stringify(src)};
        ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length);
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return JSON.stringify({ ok: ok, len: ${src.length} });
      })()`);
      console.log('copy:', cp);
      await sleep(500);
      // 2) cek clipboard isi (verifikasi)
      const rd = await evalJS(`navigator.clipboard.readText().then(t=>JSON.stringify({len:(t||'').length})).catch(e=>'ERR '+e.message)`);
      // ini promise - pakai awaitPromise
      const rd2 = await send('Runtime.evaluate', { expression: `navigator.clipboard.readText().then(t=>JSON.stringify({len:(t||'').length,head:(t||'').slice(0,30)}))`, awaitPromise: true, returnByValue: true });
      console.log('clipboard:', rd2.result && rd2.result.value);
      // 3) fokus editor, Ctrl+A, Ctrl+V
      await evalJS(`(function(){var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');ia.focus();return 'focused'})()`);
      await sleep(300);
      await key(2, 'a', 'KeyA', 65); await sleep(400);
      await key(2, 'v', 'KeyV', 86); await sleep(2500);
      console.log('after paste:', await getReport());
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));