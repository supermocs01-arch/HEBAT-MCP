const http = require('http');
const WebSocket = require('ws');

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
      await send('Runtime.enable');
      const expr = `(function(){
        try {
          var wv = window.TradingViewApi._activeChartWidgetWV.value();
          var pw = wv._chartWidget._paneWidgets._value[0];
          var bars = pw._state.m_dataSources[0]._seriesSource._data.m_bars._items;
          var n = bars.length;
          if (n < 10) return JSON.stringify({err: 'not enough bars'});
          var o=[],h=[],l=[],c=[],t=[];
          for (var i = 0; i < n; i++) {
            var b = bars[i].value;
            o.push(b[1]); h.push(b[2]); l.push(b[3]); c.push(b[4]); t.push(b[0]);
          }
          var last = c[c.length-1];
          var h24 = Math.max.apply(null, h.slice(-96));
          var l24 = Math.min.apply(null, l.slice(-96));
          var h7 = Math.max.apply(null, h);
          var l7 = Math.min.apply(null, l);
          // Calculate pivots
          var P = 5;
          var structs=[];
          for (var i=P; i<c.length-P; i++) {
            var ph=null, pl=null;
            for (var j=-P; j<=P; j++) { if (j===0) continue; if (h[i]<=h[i+j]) ph=false; if (l[i]>=l[i+j]) pl=false; }
            if (ph===false) {} else structs.push({i:i, pr:h[i], ty:'H'});
            if (pl===false) {} else structs.push({i:i, pr:l[i], ty:'L'});
          }
          // Get recent swings
          var lastH=null, lastL=null, lastHidx=-1, lastLidx=-1;
          for (var k=structs.length-1; k>=0; k--) {
            if (structs[k].ty==='H' && lastH===null) { lastH=structs[k].pr; lastHidx=structs[k].i; }
            if (structs[k].ty==='L' && lastL===null) { lastL=structs[k].pr; lastLidx=structs[k].i; }
            if (lastH!==null && lastL!==null) break;
          }
          // RSI
          function rsi(src, period) {
            if (src.length < period+1) return 50;
            var g=0, l=0;
            for (var i=src.length-period; i<src.length; i++) { var d=src[i]-src[i-1]; if(d>0) g+=d; else l-=d; }
            var ag=g/period, al=l/period;
            return al===0?100:100-100/(1+ag/al);
          }
          var r14 = rsi(c, 14);
          var r7 = rsi(c, 7);
          // Trend
          var sma20 = c.length >= 20 ? c.slice(-20).reduce((a,b)=>a+b,0)/20 : null;
          var trendBull = sma20 !== null && last > sma20;
          var trendBear = sma20 !== null && last < sma20;
          // % change
          var ch1 = n >= 2 ? ((last - c[n-2]) / c[n-2] * 100).toFixed(2) : 0;
          var ch24 = ((last - c[Math.max(0, c.length-96)]) / c[Math.max(0, c.length-96)] * 100).toFixed(2);
          return JSON.stringify({
            sym: 'HYPEUSDT.P',
            last: last,
            n: n,
            h24: h24, l24: l24,
            h7: h7, l7: l7,
            lastH: lastH, lastL: lastL,
            rsi14: r14, rsi7: r7,
            sma20: sma20,
            trend: trendBull ? 'BULLISH' : (trendBear ? 'BEARISH' : 'NEUTRAL'),
            ch1: ch1, ch24: ch24
          });
        } catch(e) { return JSON.stringify({err: e.message}); }
      })()`;
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      console.log('HYPEUSDT.P ANALYSIS:', r?.result?.value);
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => { console.error('ERR:', e.message); process.exit(1); });
