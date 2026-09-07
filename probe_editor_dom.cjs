// probe_editor_dom.cjs - petakan struktur editor/pine di TV versi baru
const http = require('http');
http.get('http://127.0.0.1:9222/json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) { return new Promise(r => { const mid = id++; const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); r(j.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); }); }
    ws.on('open', async () => {
      await send('Runtime.enable');
      const q = `(function(){
        var out={};
        out.monacoAny=document.querySelectorAll('.monaco-editor').length;
        out.monacoClasses=(function(){var s={};document.querySelectorAll('[class*="monaco"]').forEach(function(e){s[e.className.toString().slice(0,80)]=1});return Object.keys(s).slice(0,8)})();
        out.pineEls=(function(){var a=[];document.querySelectorAll('[class*="pine" i],[id*="pine" i]').forEach(function(e){a.push((e.tagName)+'.'+(e.className||'').toString().slice(0,50))});return a.slice(0,12)})();
        out.iframes=document.querySelectorAll('iframe').length;
        out.textareas=document.querySelectorAll('textarea').length;
        out.bottomTabs=(function(){var a=[];document.querySelectorAll('[data-name*="panel"],[class*="bottom"] [role="tab"],[class*="tabs"] [class*="title"]').forEach(function(e){var t=(e.textContent||'').trim().slice(0,30);if(t)a.push(t)});return a.slice(0,15)})();
        return JSON.stringify(out);
      })()`;
      const r = await send('Runtime.evaluate', { expression: q, returnByValue: true });
      console.log(r.result.value);
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));
