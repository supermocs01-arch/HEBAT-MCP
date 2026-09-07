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
    async function e(x) { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true }); return r.result && r.result.value; }
    ws.on('open', async () => {
      await send('Runtime.enable');
      const r = await send('Runtime.evaluate', {
        expression: `(function(){
var out={};
var tabs=document.querySelectorAll('a[href*="/chart/"]');
out.tabLinks=Array.prototype.slice.call(tabs,0,10).map(function(x){return x.href});
out.chartWidgets=document.querySelectorAll('.chart-widget').length;
out.pineEditors=document.querySelectorAll('.pine-editor-monaco').length;
out.editorContainer=document.querySelectorAll('.pine-editor').length;
out.canvasCount=document.querySelectorAll('canvas').length;
var legends=document.querySelectorAll('[data-name="legend-source-item"], .tv-legend');
out.legendEls=legends.length;
return JSON.stringify(out);
})()`,
        returnByValue: true
      });
      console.log(r.result.value);
      ws.close();
      process.exit(0);
    });
  });
});