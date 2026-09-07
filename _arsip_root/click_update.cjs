// click_update.cjs - klik tombol "Update pada chart" di editor Pine
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
        expression: `(function(){var all=document.querySelectorAll('[title]');for(var i=0;i<all.length;i++){var t=(all[i].getAttribute('title')||'').trim();if(/update pada chart/i.test(t)){all[i].click();return 'clicked: '+t}}var b=document.querySelectorAll('button');for(var j=0;j<b.length;j++){if(/update pada chart/i.test(b[j].textContent||'')){b[j].click();return 'clicked btn'}}return 'not found'})()`,
        returnByValue: true
      });
      console.log('1:', r.result ? r.result.value : '-');
      await new Promise(r => setTimeout(r, 4000));
      // cek ada error?
      const r2 = await send('Runtime.evaluate', {
        expression: `(function(){var els=document.querySelectorAll('.pine-error,.error-marker,.squiggly-error');return 'errdom:'+els.length})()`,
        returnByValue: true
      });
      console.log('2:', r2.result ? r2.result.value : '-');
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));