const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const SID = JSON.parse(fs.readFileSync('C:/HEBAT/config.json', 'utf8')).pineStudyId;

http.get('http://127.0.0.1:9222/json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    if (!t) { console.log('No chart'); process.exit(1); }
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    let id = 1;
    const pending = {};
    ws.on('message', raw => {
      try {
        const j = JSON.parse(raw.toString());
        if (j.id && pending[j.id]) {
          clearTimeout(pending[j.id].timer);
          const cb = pending[j.id].cb;
          delete pending[j.id];
          if (cb) cb(j.result);
        }
      } catch(e){}
    });
    function send(m, p) {
      return new Promise(r => {
        const mid = ++id;
        pending[mid] = { cb: r, timer: setTimeout(() => { delete pending[mid]; }, 8000) };
        ws.send(JSON.stringify({ id: mid, method: m, params: p || {} }));
      });
    }
    ws.on('open', async () => {
      await send('Page.enable');
      await send('Runtime.enable');
      const expr = `(function(){
        var wv=window.TradingViewApi._activeChartWidgetWV.value();
        var st=null;
        try{st=wv.getStudyById('${SID}');}catch(e){}
        if(!st){try{st=wv.getStudyById('PTdIuB');}catch(e){}}
        var src=st._study||st;
        var g=src._graphics||(src._source&&src._source._graphics);
        var pc=g._primitivesCollection;
        var col=pc.dwglabels.get('labels').get(false)._primitivesDataById;
        var pdJson=null, pdLegacy=null;
        col.forEach(function(l){
          if(l.t && l.t.indexOf('PINE_DATA_JSON')===0) pdJson=l.t;
          else if(l.t && l.t.indexOf('PINE_DATA|')===0) pdLegacy=l.t;
        });
        if(pdJson){
          try { return JSON.stringify({type:'json', raw:pdJson, data:JSON.parse(pdJson.split('|')[1])}); }
          catch(e){ return pdJson; }
        }
        if(pdLegacy) return JSON.stringify({type:'legacy', raw:pdLegacy, data:null});
        return 'NOT_FOUND';
      })()`;
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      const val = r?.result?.value;
      if (val && val !== 'NOT_FOUND') {
        try {
          const obj = JSON.parse(val);
          if (obj.data) {
            console.log('=== PINE_DATA_JSON ===');
            console.log(JSON.stringify(obj.data, null, 2));
            // Simpan ke file untuk analisa_gabungan.cjs pakai
            fs.writeFileSync('C:/HEBAT/pine_latest.json', JSON.stringify(obj.data, null, 2));
            console.log('Saved to C:/HEBAT/pine_latest.json');
          } else {
            console.log('=== PINE_DATA (legacy) ===');
            console.log(obj.raw);
          }
        } catch(e) {
          console.log(val);
        }
      } else {
        console.log('No PINE_DATA label found');
      }
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => { console.error('ERR:', e.message); process.exit(1); });
