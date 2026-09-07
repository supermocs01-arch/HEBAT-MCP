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
    async function e(x) { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true }); return r.result && r.result.value; }
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      console.log('editors before:', await e('document.querySelectorAll(".pine-editor-monaco").length'));
      // try UI close button for pine editor
      const clicked = await e(`(function(){
        var els=document.querySelectorAll('[data-name="close"], [title="Close"], .pine-editor .button.close, [aria-label="Close editor"]');
        var out=[];
        for(var i=0;i<els.length;i++){out.push(els[i].className+':'+els[i].getAttribute('title'))}
        return JSON.stringify(out);
      })()`);
      console.log('close candidates:', clicked);
      // ESC might close editor
      await key(0, 'Escape', 'Escape', 27);
      await sleep(1200);
      console.log('editors after esc:', await e('document.querySelectorAll(".pine-editor-monaco").length'));
      // try clicking the pine editor header close via UI button on panel
      const r2 = await e(`(function(){
        var panel=document.querySelector('.pine-editor-container')||document.querySelector('[data-panel-name="pine-editor"]');
        var btns=document.querySelectorAll('button');
        var hits=[];
        for(var i=0;i<btns.length;i++){
          var b=btns[i];
          var txt=(b.textContent||'').trim();
          var tt=b.getAttribute('title')||'';
          if(/close|close/i.test(tt)||txt==='×'||txt==='X'){
            hits.push({t:tt,c:b.className});
          }
        }
        return JSON.stringify(hits.slice(0,10));
      })()`);
      console.log('close buttons:', r2);
      ws.close();
      process.exit(0);
    });
  });
});