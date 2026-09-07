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
                  if (c.length < 10) return JSON.stringify({err:'not enough'});

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

                  var P = 5;
                  var len = c.length;
                  var swingHighs = [], swingLows = [];

                  // Get HIGHEST high and LOWEST low for the period for simple swing detection
                  // Use simple method: last pivot points
                  for (var i = P; i < len - P; i++) {
                    var ph = pivotHigh(h, P, P, i);
                    var pl = pivotLow(l, P, P, i);
                    if (ph !== null) swingHighs.push({idx:i, price:ph});
                    if (pl !== null) swingLows.push({idx:i, price:pl});
                  }

                  // Also detect bearish FVG on M15 timeframe
                  var lastC = c[len-1], lastH = h[len-1], lastL = l[len-1], lastO = o[len-1];
                  var high52 = h[len-3], low50 = l[len-1];
                  var low52 = l[len-3], high50 = h[len-1];

                  var fvgBullish = high52 < low50;
                  var fvgBearish = low52 > high50;

                  var fvgInfo = { aktif: false, low: 0, high: 0, tipe: '' };
                  // Scan for FVG in last 20 bars
                  for (var idx = len - 3; idx >= Math.max(2, len - 20); idx--) {
                    if (h[idx-1] < l[idx+1]) {
                      var mitigated = false;
                      for (var j = idx+2; j < len; j++) {
                        if (h[j] >= h[idx-1] && l[j] <= l[idx+1]) { mitigated = true; break; }
                      }
                      if (!mitigated) {
                        fvgInfo = { aktif: true, low: h[idx-1], high: l[idx+1], tipe: 'BULLISH' };
                        break;
                      }
                    }
                    if (l[idx-1] > h[idx+1]) {
                      var mitigated = false;
                      for (var j = idx+2; j < len; j++) {
                        if (h[j] >= h[idx+1] && l[j] <= l[idx-1]) { mitigated = true; break; }
                      }
                      if (!mitigated) {
                        fvgInfo = { aktif: true, low: h[idx+1], high: l[idx-1], tipe: 'BEARISH' };
                        break;
                      }
                    }
                  }

                  // Use SMA50 on current data as proxy for H1 SMA50
                  var sma50 = 0;
                  if (len >= 50) { var s=0; for (var i=len-50; i<len; i++) s+=c[i]; sma50 = s/50; }

                  // Use 14-period RSI as requested
                  var rsi14 = rsiCalc(c, 14);

                  // Find last swing high/low (simple method)
                  var lastSH = swingHighs.length > 0 ? swingHighs[swingHighs.length-1] : null;
                  var lastSL = swingLows.length > 0 ? swingLows[swingLows.length-1] : null;

                  var bullishBOS = lastSH !== null && lastC > lastSH.price;
                  var bearishBOS = lastSL !== null && lastC < lastSL.price;

                  // Get highest high and lowest low of last 15 bars for summary
                  var h15=0, l15=Infinity;
                  for (var i=Math.max(0,len-15); i<len; i++) {
                    if (h[i] > h15) h15 = h[i];
                    if (l[i] < l15) l15 = l[i];
                  }

                  var result = {
                    price: lastC.toFixed(2),
                    high15: h15.toFixed(2),
                    low15: l15.toFixed(2),
                    closeLast: lastC.toFixed(2),
                    rsi14: rsi14.toFixed(1),
                    sma50: sma50.toFixed(2),
                    trend: lastC > sma50 ? 'BULLISH' : 'BEARISH',
                    swingHigh: lastSH ? lastSH.price.toFixed(2) : '-',
                    swingLow: lastSL ? lastSL.price.toFixed(2) : '-',
                    bullishBOS: bullishBOS,
                    bearishBOS: bearishBOS,
                    fvg: fvgInfo,
                    openLast: lastO.toFixed(2)
                  };

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

function getSession() {
  const h = new Date().getHours() + 7; // approx WIB
  if (h >= 7 && h < 15) return 'ASIA';
  if (h >= 15 && h < 17) return 'ASIA-LONDON OVERLAP';
  if (h >= 17 && h < 21) return 'LONDON';
  if (h >= 21 || h < 2) return 'LONDON-NY OVERLAP';
  if (h >= 2 && h < 5) return 'NY';
  return 'ASIA';
}

async function monitor() {
  console.log('🤖 AUTO MONITOR AKTIF');
  console.log('Update otomatis setiap 15 menit + notifikasi jika sinyal berubah');
  console.log('Tekan Ctrl+C untuk berhenti');
  console.log('');

  let counter = 0;

  while (true) {
    const r = await analyze();
    const now = new Date();
    const jam = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');

    if (r && !r.err) {
      const trendOk = r.trend === 'BULLISH' ? '✓' : '✗';
      const bosB = r.bullishBOS ? '✓' : '✗';
      const bosS = r.bearishBOS ? '✓' : '✗';
      const fvgB = (r.fvg.aktif && r.fvg.tipe === 'BULLISH') ? '✓' : '✗';
      const fvgS = (r.fvg.aktif && r.fvg.tipe === 'BEARISH') ? '✓' : '✗';

      const rsiNum = parseFloat(r.rsi14);
      const rsiBuyOK = rsiNum < 35 ? '✓' : '✗';
      const rsiSellOK = rsiNum > 65 ? '✓' : '✗';

      const buyProgress = [bosB, trendOk, fvgB, '✗', '✗', rsiBuyOK].filter(x => x === '✓').length;
      const sellProgress = [bosS, trendOk === '✓' ? '✗' : '✓', fvgS, '✗', '✗', rsiSellOK].filter(x => x === '✓').length;

      const sesi = getSession();

      if (counter === 0 || counter % 7 === 0 || (rsiNum < 35 && !r.bullishBOS) || (rsiNum > 65 && !r.bearishBOS)) {
        console.log('');
        console.log('──────────────────────────────────────────────');
        console.log('  UPDATE ' + jam + ' WIB');
        console.log('──────────────────────────────────────────────');
        console.log('  Harga: ' + r.price + ' | High15: ' + r.high15 + ' Low15: ' + r.low15);
        console.log('  Close: ' + r.closeLast + ' | Open: ' + r.openLast);
        console.log('  RSI(14): ' + r.rsi14 + ' | SMA50: ' + r.sma50 + ' | Trend: ' + r.trend);
        console.log('  Swing H: ' + r.swingHigh + ' L: ' + r.swingLow);
        console.log('  Sesi: ' + sesi);
        console.log('');
        console.log('  BUY  → BOS:' + bosB + ' Trend:' + trendOk + ' FVG:' + fvgB + ' RSI:' + rsiBuyOK + ' (' + buyProgress + '/6)');
        console.log('  SELL → BOS:' + bosS + ' Trend:' + (trendOk === '✓' ? '✗' : '✓') + ' FVG:' + fvgS + ' RSI:' + rsiSellOK + ' (' + sellProgress + '/6)');

        if (r.fvg.aktif) {
          console.log('  FVG ' + r.fvg.tipe + ' aktif: ' + r.fvg.low + ' - ' + r.fvg.high);
        }

        if (buyProgress >= 4) console.log('  ⚠️ BUY semakin dekat!');
        if (sellProgress >= 4) console.log('  ⚠️ SELL semakin dekat!');

        if (r.bullishBOS && !r.bearishBOS && r.fvg.aktif && r.fvg.tipe === 'BULLISH' && rsiNum < 35) {
          console.log('  🚨 POTENSI BUY! Harga menyentuh FVG? Periksa chart!');
        }
        if (r.bearishBOS && !r.bullishBOS && r.fvg.aktif && r.fvg.tipe === 'BEARISH' && rsiNum > 65) {
          console.log('  🚨 POTENSI SELL! Harga menyentuh FVG? Periksa chart!');
        }

        console.log('──────────────────────────────────────────────');
      }

      counter++;
    }

    await new Promise(r => setTimeout(r, 900000)); // 15 menit
  }
}

monitor().catch(e => console.log('Error:', e.message));
