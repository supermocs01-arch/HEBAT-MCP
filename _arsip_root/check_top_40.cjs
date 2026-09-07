const http = require('http');
http.get('http://127.0.0.1:9222/json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) {
      return new Promise(r => {
        const mid = id++;
        const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); r(j.result); } };
        ws.on('message', h);
        ws.send(JSON.stringify({ id: mid, method: m, params: p || {} }));
      });
    }
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    async function key(mod, k, code, vk) {
      const b = { modifiers: mod, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, location: 1, autoRepeat: false, isKeypad: false, isSystemKey: false };
      await send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, b));
      await send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, b));
    }
    async function e(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      return r.result && r.result.value;
    }
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      await e(`(function(){var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco');if(ed.length){var ia=ed[ed.length-1].querySelector('.inputarea');ia.focus();return 'focused'}return 'noed'})()`);
      await sleep(300);
      await key(2, 'Home', 'Home', 36);
      await sleep(800);
      const dump = async () => await e(`(function(){
        var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco');
        var last=ed[ed.length-1];
        var ls=last.querySelectorAll('.view-line');
        var nums=last.querySelectorAll('.line-numbers');
        var out=[];
        for(var j=0;j<Math.min(ls.length,40);j++){
          var fn=nums[j]?nums[j].textContent:'?';
          out.push(fn+':'+ls[j].textContent.slice(0,55));
        }
        return JSON.stringify(out);
      })()`);
      console.log('TOP:', await dump());
      ws.close();
      process.exit(0);
    });
  });
});