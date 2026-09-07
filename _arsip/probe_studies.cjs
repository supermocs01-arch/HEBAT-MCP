// probe_studies.cjs - daftar studi + value terakhir
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
          var wv = window.TradingViewApi._activeChartWidgetWV.value();
          var model = wv._chartWidget.model();
          var studies = model.studies();
          var arr = [];
          for (var i=0;i<studies.length;i++) {
            var st = studies[i];
            var meta = st.metaInfo();
            var nm = '';
            try { nm = meta.longName || meta.shortId || ''; } catch(e){}
            arr.push({name:nm, id:st.id()});
          }
          return {count:studies.length, list:arr};
        })())`,
        returnByValue: true
      });
      let val;
      try { val = JSON.parse(r.result.result.value); } catch(e) { val = r.result && r.result.result ? r.result.result.value : JSON.stringify(r); }
      console.log(val);
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));