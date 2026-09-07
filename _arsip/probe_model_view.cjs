// probe_model_view.cjs - insert chunk 380, baca view-lines (model) bukan textarea
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
    async function viewTop() {
      return await evalJS(`(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ls=ed.querySelectorAll('.view-line');var nums=ed.querySelectorAll('.line-numbers');var out=[];for(var i=0;i<ls.length&&i<8;i++){var n=nums[i]?nums[i].textContent:'?';out.push(n+':'+ls[i].textContent.slice(0,40))}return JSON.stringify(out)})()`);
    }
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      await evalJS(`(function(){var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');ia.focus();return 'focused'})()`);
      await sleep(300);
      await key(2, 'a', 'KeyA', 65); await sleep(300);
      await send('Input.insertText', { text: 'X' }); await sleep(400);
      console.log('after X view:', await viewTop());
      // hapus X
      await key(2, 'a', 'KeyA', 65); await sleep(300);
      await key(0, 'Backspace', 'Backspace', 8); await sleep(400);
      console.log('after clear view:', await viewTop());
      // insert 380 pertama
      const part = '//@version=6\nindicator("SMC SWING PATEN v1", overlay=true, max_lines_count=100, max_labels_count=100, max_boxes_count=50)\n\n// ============ INPUT PATEN KITA ============\nTF_Entry      = input.timeframe("15", "TF Entry (M15)")\n';
      await send('Input.insertText', { text: part });
      await sleep(800);
      console.log('after insert380 view:', await viewTop());
      const ta = await evalJS(`(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');return JSON.stringify({taLen:(ia.value||'').length,taHead:(ia.value||'').slice(0,40)})})()`);
      console.log('textarea:', ta);
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));