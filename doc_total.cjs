// doc_total.cjs - fokus editor, Ctrl+End, baca baris terakhir + hitung tinggi scroll
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
      await send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: mod, key, code, windowsVirtualKeyCode: vk });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: mod, key, code, windowsVirtualKeyCode: vk });
    }
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      const r0 = await send('Runtime.evaluate', {
        expression: `(function(){var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');ia.focus();return 'focused'})()`,
        returnByValue: true
      });
      await key(2, 'End', 'End', 35);
      await sleep(800);
      const r1 = await send('Runtime.evaluate', {
        expression: `JSON.stringify((function(){
          var ed = document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];
          var ls = ed.querySelectorAll('.view-line');
          var nums = ed.querySelectorAll('.line-numbers');
          var out = [];
          for (var i=0;i<ls.length;i++) {
            var n = nums[i] ? nums[i].textContent : '?';
            out.push(n + '|' + ls[i].textContent.slice(0,100));
          }
          var sc = ed.querySelector('.monaco-scrollable-element');
          return { lines: out.slice(-8), scrollElH: sc ? sc.scrollHeight : 'none' };
        })())`,
        returnByValue: true
      });
      console.log(r1.result && r1.result.value ? r1.result.value : JSON.stringify(r1.result));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));