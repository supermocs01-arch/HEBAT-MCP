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
        const h = raw => {
          const j = JSON.parse(raw.toString());
          if (j.id === mid) { ws.removeListener('message', h); r(j.result); }
        };
        ws.on('message', h);
        ws.send(JSON.stringify({ id: mid, method: m, params: p || {} }));
      });
    }
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    async function e(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      return r.result && r.result.value;
    }
    ws.on('open', async () => {
      await send('Runtime.enable');
      await sleep(500);
      const dump = async i => await e(`(function(){
        var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[${i}];
        if(!ed)return JSON.stringify({idx:${i},missing:true});
        var ls=ed.querySelectorAll('.view-line');
        var nums=ed.querySelectorAll('.line-numbers');
        var out=[];
        for(var j=0;j<Math.min(ls.length,8);j++){
          var fn=nums[j]?nums[j].textContent:'?';
          out.push(fn+':'+ls[j].textContent.slice(0,60));
        }
        var ia=ed.querySelector('.inputarea');
        return JSON.stringify({idx:${i},sz:[ed.offsetWidth,ed.offsetHeight],lines:out,ta:(ia.value||'').slice(0,40)});
      })()`);
      console.log('ed0:', await dump(0));
      console.log('ed1:', await dump(1));
      ws.close();
      process.exit(0);
    });
  });
});