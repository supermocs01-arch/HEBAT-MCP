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
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    const resolutions = [
      { tf: '5', label: 'M5' },
      { tf: '15', label: 'M15' },
      { tf: '30', label: 'M30' },
      { tf: '60', label: 'H1' },
      { tf: '240', label: 'H4' },
      { tf: 'D', label: 'D1' },
      { tf: '5', label: 'M5' }
    ];

    const pineExpr = `(function(){
      var wv=window.TradingViewApi._activeChartWidgetWV.value();
      var st=null;
      try{st=wv.getStudyById('${SID}');}catch(e){}
      if(!st){try{st=wv.getStudyById('PTdIuB');}catch(e){}}
      var src=st._study||st;
      var g=src._graphics||(src._source&&src._source._graphics);
      var pc=g._primitivesCollection;
      var col=pc.dwglabels.get('labels').get(false)._primitivesDataById;
      var pdLegacy=null, pdJson=null;
      col.forEach(function(l){
        if(l.t && l.t.indexOf('PINE_DATA_JSON|')===0) pdJson=l.t;
        else if(l.t && l.t.indexOf('PINE_DATA|')===0) pdLegacy=l.t;
      });
      return pdLegacy || pdJson || 'NOT_FOUND';
    })()`;

    ws.on('open', async () => {
      await send('Page.enable');
      await send('Runtime.enable');

      console.log('=== SCAN ALL TF + M5 ===');
      console.log('');

      for (const { tf, label } of resolutions) {
        try {
          await send('Runtime.evaluate', {
            expression: "window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.setResolution('" + tf + "')",
            returnByValue: true
          });
          await sleep(5000);

          const r = await send('Runtime.evaluate', { expression: pineExpr, returnByValue: true });
          const pine = r?.result?.value || 'NOT_FOUND';

          if (pine !== 'NOT_FOUND') {
            if (pine.indexOf('PINE_DATA_JSON|') === 0) {
              try {
                let jsonStr = pine.split('|')[1];
                jsonStr = jsonStr.replace(/\\"/g, '"').replace(/\\n/g, '');
                const json = JSON.parse(jsonStr);
                console.log(`[${label}] px=${json.px} RSI=${json.rsi} sig=${json.sig} ready=${json.ready} alasan=${json.alasan} zona=${json.zona} mid=${json.mid} sesi=${json.sesi} MTF=${json.mtf}`);
              } catch(e) {
                console.log(`[${label}] JSON parse error: ${e.message}`);
              }
            } else if (pine.indexOf('PINE_DATA|') === 0) {
              const parts = pine.replace('PINE_DATA|', '').split('|');
              const [price, rsi, sig, ready, atr, alasan, zona, mid, sl, tp1, tp2, sesi, mtf] = parts;
              console.log(`[${label}] price=${price} RSI=${rsi} sig=${sig} ready=${ready} alasan=${alasan} zona=${zona} mid=${mid} sesi=${sesi} MTF=${mtf}`);
            } else {
              console.log(`[${label}] ${pine.substring(0, 100)}`);
            }
          } else {
            console.log(`[${label}] PINE NOT_FOUND`);
          }
        } catch(e) {
          console.log(`[${label}] ERROR: ${e.message}`);
        }
      }

      console.log('');
      console.log('=== DONE ===');
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => { console.error('ERR:', e.message); process.exit(1); });
