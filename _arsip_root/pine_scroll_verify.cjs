// pine_scroll_verify.cjs - scroll mouse di editor, baca view-lines saat baris 25-40 tampil
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
    async function evalJS(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      return r.result && r.result.value;
    }
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      // scroll 200px di dalam editor (x 1000, y 500), reint
      for (let i = 0; i < 20; i++) {
        await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 1000, y: 500, deltaX: 0, deltaY: 100 });
        await sleep(60);
      }
      await sleep(500);
      const r = await evalJS(`(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];if(!ed)return 'no ed';var ls=ed.querySelectorAll('.view-line');var nums=ed.querySelectorAll('.line-numbers');var out=[];for(var i=0;i<ls.length;i++){var n=nums[i]?nums[i].textContent:'?';var nv=parseInt(n,10);if(!isNaN(nv)&&nv>=20&&nv<=45){out.push(n+':'+ls[i].textContent.slice(0,60))}}return JSON.stringify(out)})()`);
      const o = JSON.parse(r);
      o.forEach(x => console.log(x));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));