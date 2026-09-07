// pine_save_update.cjs - fokus editor, Ctrl+S (save), lalu klik Update pada chart, verifikasi status
const http = require('http');
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
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      // fokus editor
      await evalJS(`(function(){var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');ia.focus();return 'focused'})()`);
      await sleep(300);
      // Ctrl+S
      await key(2, 'KeyS', 'KeyS', 83);
      await sleep(2000);
      // verifikasi value editor masih 5673
      const v1 = await evalJS(`(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');return 'taLen:'+(ia.value||'').length})()`);
      console.log('after Ctrl+S:', v1);
      // klik Update pada chart
      const r2 = await send('Runtime.evaluate', {
        expression: `(function(){var b=document.querySelector('[title="Update pada chart"]');if(!b)return 'not found';b.click();return 'clicked'})()`,
        returnByValue: true
      });
      console.log('update:', r2.result && r2.result.value);
      await sleep(4000);
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));