// peek_editors.cjs - snapshot singkat kedua editor
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
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      const r = await send('Runtime.evaluate', {
        expression: `JSON.stringify((function(){
          var eds = document.querySelectorAll('.monaco-editor.pine-editor-monaco');
          var out = [];
          for (var i=0;i<eds.length;i++) {
            var ed = eds[i];
            var ls = ed.querySelectorAll('.view-line');
            var nums = ed.querySelectorAll('.line-numbers');
            var firstNum = nums[0] ? nums[0].textContent : '?';
            var lastNum = nums[nums.length-1] ? nums[nums.length-1].textContent : '?';
            var firstTxt = ls[0] ? ls[0].textContent.slice(0,60) : '';
            out.push({ i: i, viewLines: ls.length, firstNum: firstNum, lastNum: lastNum, firstTxt: firstTxt });
          }
          return out;
        })())`,
        returnByValue: true
      });
      console.log(r.result && r.result.value ? r.result.value : JSON.stringify(r.result));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));