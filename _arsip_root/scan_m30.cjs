const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/C59F037685BE95BBCA42BC376F474B5D');
ws.on('unexpected-response', (req, res) => { console.log('UNEXPECTED RESPONSE: ' + res.statusCode); process.exit(1); });
ws.on('error', (e) => { console.log('CDP ERROR: ' + e.message); process.exit(1); });
setTimeout(() => { console.log('TIMEOUT 60s - exit'); process.exit(1); }, 60000).unref();

let idc = 0;
function send(method, params = {}) {
  return new Promise((res, rej) => {
    const id = ++idc;
    const h = (raw) => {
      let resp;
      try { resp = JSON.parse(raw.toString()); } catch (e) { return; }
      if (resp.id === id) {
        ws.removeListener('message', h);
        if (resp.error) rej(new Error(method + ' -> ' + resp.error.message));
        else res(resp.result);
      }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const FIBO_IG = [
  { pct: '0 (swing HIGH)', price: 4402.215 },
  { pct: '0.109', price: 4392.277 },
  { pct: '0.127', price: 4390.636 },
  { pct: '0.145', price: 4388.995 },
  { pct: '0.214', price: 4382.704 },
  { pct: '0.232', price: 4381.062 },
  { pct: '0.25', price: 4379.421 },
  { pct: '0.618', price: 4345.869 },
  { pct: '0.636', price: 4344.228 },
  { pct: '0.654', price: 4342.587 },
  { pct: '0.786', price: 4330.551 },
  { pct: '0.804', price: 4328.910 },
  { pct: '0.82', price: 4327.452 },
];

function readPine() {
  return `(function(){
    var out={};
    try{
      var chart=window.TradingViewApi._activeChartWidgetWV.value();
      var st=chart.getStudyById('PTdIuB');
      var src=st._study||st;
      var g=src._graphics||(src._source&&src._source._graphics);
      var pc=g._primitivesCollection;
      var bars=chart._chartWidget._paneWidgets._value[0]._state.m_dataSources[0]._seriesSource._data.m_bars._items;
      var times=[];for(var bi=0;bi<bars.length;bi++){times[bi]=bars[bi].value[0]}
      var idx=g._indexes||[];
      function barOf(x){return idx[x]!=null&&idx[x]>0?idx[x]:x}
      function dts(b){var tm=times[b];if(tm==null)return null;var dd=new Date(tm*1000);return dd.toISOString().slice(0,10)+' '+dd.toISOString().slice(11,16)}
      var col=pc.dwglabels.get('labels').get(false)._primitivesDataById;
      var labels=[];
      col.forEach(function(l){var b=barOf(l.x);labels.push({b:b,dt:dts(b),y:l.y,t:l.t})});
      labels.sort(function(a,b){return a.b-b.b});
      var pd=null;
      for(var i=labels.length-1;i>=0;i--){if(labels[i].t.indexOf('PINE_DATA')===0){pd=labels[i];break}}
      out.price=bars[bars.length-1].value[4];
      out.pineData=pd;
      return JSON.stringify(out);
    }catch(e){return JSON.stringify({err:e.message})}
  })()`;
}

ws.on('open', async () => {
  try {
    console.log('STEP 0: ws open');
    const e1 = await send('Runtime.enable');
    console.log('STEP 1: enable ok');
    const e2 = await send('Runtime.evaluate', { expression: `window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.setResolution('30')` });
    console.log('STEP 2: set M30 ok');
    await sleep(5000);
    const p = await send('Runtime.evaluate', { expression: readPine(), returnByValue: true });
    console.log('STEP 3: pine raw=' + JSON.stringify(p).substring(0, 200));
    if (!p || !p.result || !p.result.value) { console.log('PINE RESPONSE INVALID: ' + JSON.stringify(p).substring(0, 400)); throw new Error('pine response invalid'); }
    const pine = JSON.parse(p.result.value);
    await send('Runtime.evaluate', { expression: `window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.setResolution('15')` });

    const pd = pine.pineData ? (() => { const f = pine.pineData.t.split('|'); return { price: +f[1], rsi: +f[2], sig: f[3], ready: +f[4], atr: +f[5], dt: pine.pineData.dt }; })() : null;
    const harga = pd ? pd.price : pine.price;

    console.log('=== SCAN M30 vs FIBO IG ===');
    console.log('PINE M30: harga=' + harga + ' RSI=' + (pd ? pd.rsi : '?') + ' sig=' + (pd ? pd.sig : '?') + ' ready=' + (pd ? pd.ready : '?') + ' ATR=' + (pd ? pd.atr : '?'));
    console.log('');
    const zonaSell = { atas: FIBO_IG[3].price, bawah: FIBO_IG[6].price, label: 'zona SELL 75-82 (0.145-0.25)' };
    console.log('ZONA SELL (IG): ' + zonaSell.label + ' = ' + zonaSell.atas + ' - ' + zonaSell.bawah);
    if (harga >= zonaSell.bawah && harga <= zonaSell.atas) console.log('>>> HARGA DI DALAM ZONA SELL 75-82!');
    else if (harga > zonaSell.atas) console.log('>>> HARGA DI ATAS zona sell (jarak ' + (harga - zonaSell.atas).toFixed(1) + ' poin)');
    else console.log('>>> HARGA DI BAWAH zona sell (jarak ' + (zonaSell.bawah - harga).toFixed(1) + ' poin)');
    console.log('');
    console.log('Level FIBO M30 (dari sinyal):');
    for (const l of FIBO_IG) console.log('  ' + l.pct + ' | ' + l.price.toFixed(3) + ' | jarak: ' + (harga - l.price).toFixed(1) + ' poin');
    console.log('');
    console.log('Cek leg: swing LOW tersirat = ' + (4402.215 - (4402.215 - 4379.421) / 0.25).toFixed(3));
    ws.close();
  } catch (e) {
    console.log('SCAN ERROR: ' + e.message);
    console.log(e.stack);
    ws.close();
    process.exit(1);
  }
});