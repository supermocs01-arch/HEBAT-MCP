// pine_paste_cdp.cjs - clipboard real + Ctrl+V via CDP (trusted key event)
const fs = require('fs');
const http = require('http');
const src = fs.readFileSync('C:/HEBAT/tradingview-mcp/scripts/current.pine', 'utf-8');

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
      const base = { modifiers: mod, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, location: 1, autoRepeat: false, isKeypad: false, isSystemKey: false };
      await send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, base));
      await send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, base));
    }
    async function evalJS(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      return r.result && r.result.value;
    }
    async function viewTop() {
      return await evalJS(`(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ls=ed.querySelectorAll('.view-line');var nums=ed.querySelectorAll('.line-numbers');var out=[];for(var i=0;i<Math.min(ls.length,3);i++){var n=nums[i]?nums[i].textContent:'?';out.push(n+':'+ls[i].textContent.slice(0,40))}return JSON.stringify(out)})()`);
    }
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      await evalJS(`(function(){var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');ia.focus();(function(sel){try{var r=document.createRange();r.selectNodeContents(document.body);sel.removeAllRanges();sel.addRange(r)}catch(e){}})( window.getSelection());return 'ok'})()`);
      await sleep(300);
      // set clipboard contents natively
      const cb = await evalJS(`navigator.clipboard.writeText(${JSON.stringify(src)}).then(function(){return 'written'}).catch(function(e){return 'cbERR:'+e.toString()})`);
      console.log('clipboard:', cb);
      await sleep(800);
      // Ctrl+A then Ctrl+V
      await key(2, 'a', 'KeyA', 65);
      await sleep(700);
      await key(2, 'v', 'KeyV', 86);
      console.log('paste sent, wait 5000');
      await sleep(5000);
      console.log('view:', await viewTop());
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));