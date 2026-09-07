const http = require('http');
const WebSocket = require('ws');

let lastState = '';

function analyze() {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const targets = JSON.parse(data);
          const chart = targets.find(t => t.url && t.url.includes('/chart/') && !t.url.includes('doubleclick') && !t.url.includes('google'));
          if (!chart) { resolve(null); return; }

          const ws = new WebSocket(chart.webSocketDebuggerUrl);
          let done = false;
          const timeout = setTimeout(() => { if (!done) { ws.close(); resolve(null); } }, 15000);

          ws.onopen = () => {
            ws.send(JSON.stringify({id:1, method:'Runtime.evaluate', params:{ expression: `
              (function(){
                try {
                  var api = window.TradingViewApi;
                  var wv = api._activeChartWidgetWV.value();
                  var model = wv._chartWidget.model();
                  var b = model.mainSeries().bars();
                  var n = b.size();
                  var s = Math.max(0, n - 100);
                  var c=[], l=[], h=[], o=[];
                  for (var i = s; i < n; i++) {
                    var v = b.valueAt(i);
                    if (v) { o.push(v[1]); h.push(v[2]); l.push(v[3]); c.push(v[4]); }
                  }
                  if (c.length < 30) return JSON.stringify({err:'not enough'});

                  function pivotHigh(src, left, right, idx) {
                    if (idx < left || idx + right >= src.length) return null;
                    for (var i = -left; i <= right; i++) {
                      if (i === 0) continue;
                      if (src[idx] <= src[idx + i]) return null;
                    }
                    return src[idx];
                  }
                  function pivotLow(src, left, right, idx) {
                    if (idx < left || idx + right >= src.length) return null;
                    for (var i = -left; i <= right; i++) {
                      if (i === 0) continue;
                      if (src[idx] >= src[idx + i]) return null;
                    }
                    return src[idx];
                  }
                  function rsiCalc(src, period) {
                    if (src.length < period + 1) return 50;
                    var g=0, ls=0;
                    for (var i = src.length - period; i < src.length; i++) {
                      var d = src[i] - src[i-1];
                      if (d > 0) g += d; else ls -= d;
                    }
                    var ag = g / period, al = ls / period;
                    return al === 0 ? 100 : 100 - 100 / (1 + ag/al);
                  }
                  function atrCalc(high, low, close, period) {
                    if (high.length < period + 1) return 5;
                    var sum=0;
                    for (var i = high.length - period; i < high.length; i++) {
                      var tr = Math.max(high[i]-low[i], Math.abs(high[i]-close[i-1]), Math.abs(low[i]-close[i-1]));
                      sum += tr;
                    }
                    return sum / period;
                  }

                  var P = 5;
                  var len = c.length;
                  var swingHighs = [], swingLows = [];
                  for (var i = P; i < len - P; i++) {
                    var ph = pivotHigh(h, P, P, i);
                    var pl = pivotLow(l, P, P, i);
                    if (ph !== null) swingHighs.push({idx:i, price:ph});
                    if (pl !== null) swingLows.push({idx:i, price:pl});
                  }

                  var lastSH = swingHighs.length > 0 ? swingHighs[swingHighs.length-1] : null;
                  var lastSL = swingLows.length > 0 ? swingLows[swingLows.length-1] : null;
                  var curClose = c[len-1];

                  var bullishBOS = lastSH !== null && curClose > lastSH.price;
                  var bearishBOS = lastSL !== null && curClose < lastSL.price;

                  // FVG dalam 20 bar
                  var fvgInfo = { aktif: false, low: 0, high: 0, tipe: '' };
                  for (var i = len - 3; i >= Math.max(2, len - 20); i--) {
                    if (h[i-1] < l[i+1]) {
                      var fl = h[i-1], fh = l[i+1];
                      var mitigated = false;
                      for (var j = i+2; j < len; j++) {
                        if (h[j] >= fl && l[j] <= fh) { mitigated = true; break; }
                      }
                      if (!mitigated) { fvgInfo = { aktif: true, low: fl, high: fh, tipe: 'BULLISH', barIdx: i+1 }; }
                      break;
                    }
                    if (l[i-1] > h[i+1]) {
                      var fl = h[i+1], fh = l[i-1];
                      var mitigated = false;
                      for (var j = i+2; j < len; j++) {
                        if (h[j] >= fl && l[j] <= fh) { mitigated = true; break; }
                      }
                      if (!mitigated) { fvgInfo = { aktif: true, low: fl, high: fh, tipe: 'BEARISH', barIdx: i+1 }; }
                      break;
                    }
                  }

                  // OB
                  var obLow=0, obHigh=0, obFound=false;
                  if (bearishBOS && lastSL) {
                    var slIdx = lastSL.idx;
                    for (var i = slIdx - 1; i >= Math.max(0, slIdx - 10); i--) {
                      if (c[i] > o[i]) { obLow = l[i]; obHigh = h[i]; obFound = true; break; }
                    }
                  }
                  if (bullishBOS && lastSH) {
                    var shIdx = lastSH.idx;
                    for (var i = shIdx - 1; i >= Math.max(0, shIdx - 10); i--) {
                      if (c[i] < o[i]) { obLow = l[i]; obHigh = h[i]; obFound = true; break; }
                    }
                  }

                  var rsiVal = rsiCalc(c, 7);
                  var sma50 = 0;
                  if (len >= 50) { var s=0; for (var i=len-50; i<len; i++) s+=c[i]; sma50 = s/50; }
                  var trendBuy = curClose > sma50;
                  var trendSell = curClose < sma50;

                  var inFVG = fvgInfo.aktif && l[len-1] <= fvgInfo.high && h[len-1] >= fvgInfo.low;
                  var obTol = 0.3 / 100;
                  var obZL = obFound ? obLow * (1 - obTol) : 0;
                  var obZH = obFound ? obHigh * (1 + obTol) : 0;
                  var inOB = obFound && l[len-1] <= obZH && h[len-1] >= obZL;

                  var buyOK = bullishBOS && trendBuy && fvgInfo.aktif && fvgInfo.tipe === 'BULLISH' && fvgInfo.high < (lastSH ? lastSH.price : Infinity);
                  var sellOK = bearishBOS && trendSell && fvgInfo.aktif && fvgInfo.tipe === 'BEARISH' && fvgInfo.low > (lastSL ? lastSL.price : -Infinity);

                  var ready = false, arah = 0;
                  if (buyOK && inFVG && inOB && rsiVal < 40) { ready = true; arah = 1; }
                  if (sellOK && inFVG && inOB && rsiVal > 60) { ready = true; arah = -1; }

                  var result = {
                    price: curClose, rsi: rsiVal, sma50: sma50,
                    trendBuy: trendBuy, trendSell: trendSell,
                    shPrice: lastSH ? lastSH.price : null,
                    slPrice: lastSL ? lastSL.price : null,
                    bullishBOS: bullishBOS, bearishBOS: bearishBOS,
                    fvg: fvgInfo, ob: obFound ? {low:obLow, high:obHigh} : null,
                    inFVG: inFVG, inOB: inOB, buyOK: buyOK, sellOK: sellOK,
                    ready: ready, arah: arah
                  };

                  if (ready) {
                    var lotSize = 0.02, nilaiPP = 0.10, targetP = 15, tp2Mult = 1.2, atrPer = 14, atrMarg = 0.3;
                    var pv = nilaiPP * (lotSize / 0.01), tp = targetP / pv, R = 4.0;
                    var atrV = atrCalc(h, l, c, atrPer), slPad = atrV * atrMarg;
                    var eP = curClose;
                    if (arah === 1) {
                      result.entry = eP; result.sl = fvgInfo.low - slPad;
                      result.tp1 = eP + tp; result.tp2 = eP + tp * tp2Mult;
                    } else {
                      result.entry = eP; result.sl = fvgInfo.high + slPad;
                      result.tp1 = eP - tp; result.tp2 = eP - tp * tp2Mult;
                    }
                    var sD = Math.abs(eP - result.sl), tD = Math.abs(result.tp1 - eP);
                    result.rrActual = sD > 0 ? tD / sD : 0;
                    result.rrOK = result.rrActual >= R;
                    result.atr = atrV;
                  }

                  return JSON.stringify(result);
                } catch(e) { return JSON.stringify({err:e.message}); }
              })()
            `}}));
          };

          ws.onmessage = (event) => {
            const m = JSON.parse(event.data);
            if (m.id === 1 && m.result) {
              clearTimeout(timeout);
              done = true;
              try { resolve(JSON.parse(m.result.result.value)); }
              catch(e) { resolve(null); }
              ws.close();
            }
          };
          ws.onerror = () => { clearTimeout(timeout); done = true; resolve(null); };
        } catch(e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

function printState(r) {
  if (!r || r.err) return;
  const now = new Date();
  const time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ':' + now.getSeconds().toString().padStart(2,'0');

  let signal = '🟡 TIDAK ADA SINYAL';
  if (r.ready && r.rrOK) signal = '🔥 SINYAL VALID! ENTRY ' + (r.arah === 1 ? 'BUY' : 'SELL');
  else if (r.ready && !r.rrOK) signal = '⚠️ KONDISI TERPENUHI TAPI RR TIDAK OK';
  else if (r.buyOK) signal = '🟢 MENUNGGU RETRACE BUY';
  else if (r.sellOK) signal = '🔴 MENUNGGU RETRACE SELL';

  const dir = r.bullishBOS ? 'BEARISH' : r.bearishBOS ? 'BULLISH' : '-';
  const bosStatus = r.bullishBOS ? 'YA (Bullish)' : r.bearishBOS ? 'YA (Bearish)' : 'TIDAK';

  const stateKey = r.price.toFixed(1) + '|' + r.rsi.toFixed(1) + '|' + r.ready;
  if (stateKey === lastState && !r.ready) return; // skip if no change and no signal
  lastState = stateKey;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⏰ ' + time + ' | Harga: ' + r.price.toFixed(2) + ' | RSI: ' + r.rsi.toFixed(1));
  console.log('BOS: ' + bosStatus + ' | Swing: H=' + (r.shPrice !== null ? r.shPrice.toFixed(2) : '-') + ' L=' + (r.slPrice !== null ? r.slPrice.toFixed(2) : '-'));
  console.log(signal);

  if (r.ready) {
    if (r.rrOK) {
      console.log('>> ENTRY: ' + r.entry.toFixed(2) + ' SL: ' + r.sl.toFixed(2) + ' TP1: ' + r.tp1.toFixed(2) + ' TP2: ' + r.tp2.toFixed(2));
      console.log('>> RR: 1:' + r.rrActual.toFixed(2) + ' ✅');
    } else {
      console.log('>> RR GAGAL: ' + r.rrActual.toFixed(2) + ' (wajib >= 4)');
    }
  }

  // Additional info when signal found
  if (r.ready && r.rrOK) {
    console.log('');
    console.log('⚠️  SINYAL DITEMUKAN! Entry sekarang?');
  }
}

async function monitor() {
  console.log('🤖 AUTO MONITOR AKTIF — akan cek setiap 2 menit');
  console.log('Tekan Ctrl+C untuk berhenti');
  console.log('');

  while (true) {
    const r = await analyze();
    printState(r);
    await new Promise(r => setTimeout(r, 120000)); // 2 menit
  }
}

monitor().catch(e => console.log('Error:', e.message));
