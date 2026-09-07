// diag_selectall.cjs - Ctrl+A lalu cek seleksi
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
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      const r0 = await send('Runtime.evaluate', {
        expression: `(function(){var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');ia.focus();return 'focused'})()`,
        returnByValue: true
      });
      await sleep(300);
      await key(2, 'a', 'KeyA', 65);
      await sleep(800);
      const r1 = await send('Runtime.evaluate', {
        expression: `(function(){
          var sel = document.getSelection();
          var txt = sel ? sel.toString() : '';
          var ed = document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];
          var ia = ed.querySelector('.inputarea');
          var out = { selLen: txt.length, selHead: txt.slice(0,60), selTail: txt.slice(-60) };
          if (ia) {
            var iaSelStart = ia.selectionStart, iaSelEnd = ia.selectionEnd;
            out.iaSel = iaSelStart + '-' + iaSelEnd;
            out.iaValLen = (ia.value || '').length;
            out.iaValHead = (ia.value || '').slice(0,50);
          }
          return JSON.stringify(out);
        })()`,
        returnByValue: true
      });
      console.log(r1.result && r1.result.value ? r1.result.value : '-');
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));