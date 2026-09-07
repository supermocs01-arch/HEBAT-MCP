// probe_tabs.cjs - cek editor index 0, tab editor pine, dan isi editor aktif
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
          var out = {editors: []};
          var eds = document.querySelectorAll('.monaco-editor.pine-editor-monaco');
          for (var i=0;i<eds.length;i++) {
            var ed = eds[i];
            var ls = ed.querySelectorAll('.view-line');
            var nums = ed.querySelectorAll('.line-numbers');
            var ta = ed.querySelector('.inputarea');
            out.editors.push({i:i, lines:ls.length, taLen: ta ? ta.value.length : -1,
              first:(nums[0]?nums[0].textContent:'?')+':'+(ls[0]?ls[0].textContent.slice(0,30):'')});
          }
          // cari tab pine (data-name atau teks)
          var tabs = document.querySelectorAll('[data-name="editor-tab"], .editor-tab, [role=tab]');
          var tabInfo = [];
          for (var j=0;j<tabs.length;j++) tabInfo.push((tabs[j].textContent||'').trim().slice(0,40));
          out.tabs = tabInfo.slice(0,10);
          // area dialog pine editor ada?
          var dlg = document.querySelectorAll('.pine-editor-dialog, [class*=pine-editor]');
          out.pineCls = [];
          for (var k=0;k<dlg.length;k++) out.pineCls.push((dlg[k].className||'').toString().slice(0,50));
          return out;
        })())`,
        returnByValue: true
      });
      console.log(r.result && r.result.value ? r.result.value : JSON.stringify(r.result));
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));