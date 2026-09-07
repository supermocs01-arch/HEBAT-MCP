const http = require('http');

http.get('http://127.0.0.1:9222/json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const targets = JSON.parse(data);
    const chart = targets.find(t => t.url && t.url.includes('/chart/') && !t.url.includes('doubleclick') && !t.url.includes('google'));
    if (!chart) { console.log('Chart tidak ditemukan'); process.exit(1); }

    const WebSocket = require('ws');
    const ws = new WebSocket(chart.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({id:1, method:'Runtime.evaluate', params:{ expression: `
        (function(){
          try {
            var api = window.TradingViewApi;
            var wv = api._activeChartWidgetWV.value();
            var model = wv._chartWidget.model();
            var symbol = model.mainSeries().symbol();
            var b = model.mainSeries().bars();
            var n = b.size();
            var s = Math.max(0, n - 100);
            var c=[], l=[], h=[], o=[], t=[];
            for (var i = s; i < n; i++) {
              var v = b.valueAt(i);
              if (v) { o.push(v[1]); h.push(v[2]); l.push(v[3]); c.push(v[4]); t.push(v[0]); }
            }
            if (c.length < 10) return JSON.stringify({err:'Data tidak cukup, hanya ' + c.length + ' bar'});

            // === FUNGSI ===
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
            function rsi(src, period) {
              if (src.length < period + 1) return 50;
              var gains=0, losses=0;
              for (var i = src.length - period; i < src.length; i++) {
                var d = src[i] - src[i-1];
                if (d > 0) gains += d; else losses -= d;
              }
              var ag = gains / period, al = losses / period;
              return al === 0 ? 100 : 100 - 100 / (1 + ag/al);
            }
            function atr(high, low, close, period) {
              if (high.length < period + 1) return 5;
              var sum=0;
              for (var i = high.length - period; i < high.length; i++) {
                var tr = Math.max(high[i]-low[i], Math.abs(high[i]-close[i-1]), Math.abs(low[i]-close[i-1]));
                sum += tr;
              }
              return sum / period;
            }
            function sma(src, period, idx) {
              if (idx < period - 1) return null;
              var sum=0;
              for (var i = idx - period + 1; i <= idx; i++) sum += src[i];
              return sum / period;
            }

            var len = c.length;
            var P = 5; // Panjang Swing

            // === SWING POINTS ===
            var swingHighs = [], swingLows = [];
            for (var i = P; i < len - P; i++) {
              var ph = pivotHigh(h, P, P, i);
              var pl = pivotLow(l, P, P, i);
              if (ph !== null) swingHighs.push({idx:i, price:ph});
              if (pl !== null) swingLows.push({idx:i, price:pl});
            }

            var lastSH = swingHighs.length > 0 ? swingHighs[swingHighs.length-1] : null;
            var lastSL = swingLows.length > 0 ? swingLows[swingLows.length-1] : null;
            var currentClose = c[len-1];
            var currentHigh = h[len-1];
            var currentLow = l[len-1];

            // === BOS ===
            var bullishBOS = lastSH !== null && currentClose > lastSH.price;
            var bearishBOS = lastSL !== null && currentClose < lastSL.price;

            // === FVG ===
            var fvgBullish = len >= 3 && h[len-3] < l[len-1];
            var fvgBearish = len >= 3 && l[len-3] > h[len-1];

            var fvgInfo = { aktif: false, low: 0, high: 0, tipe: '', barIdx: -1 };
            // Cari FVG dalam 20 bar terakhir
            for (var i = len - 3; i >= Math.max(2, len - 20); i--) {
              if (h[i-1] < l[i+1]) {
                // Bullish FVG di bar i (i-1, i, i+1)
                var fl = h[i-1], fh = l[i+1];
                var mitigated = false;
                for (var j = i+2; j < len; j++) {
                  if (h[j] >= fl && l[j] <= fh) { mitigated = true; break; }
                }
                if (!mitigated) {
                  fvgInfo = { aktif: true, low: fl, high: fh, tipe: 'BULLISH', barIdx: i+1 };
                }
                break;
              }
              if (l[i-1] > h[i+1]) {
                // Bearish FVG
                var fl = h[i+1], fh = l[i-1];
                var mitigated = false;
                for (var j = i+2; j < len; j++) {
                  if (h[j] >= fl && l[j] <= fh) { mitigated = true; break; }
                }
                if (!mitigated) {
                  fvgInfo = { aktif: true, low: fl, high: fh, tipe: 'BEARISH', barIdx: i+1 };
                }
                break;
              }
            }

            // OB yang relevan: cari candle terakhir sebelum BOS
            var obLow=0, obHigh=0, obFound=false;
            if (bullishBOS && lastSH) {
              // Cari bearish candle sebelum swing high
              var shIdx = lastSH.idx;
              for (var i = shIdx - 1; i >= Math.max(0, shIdx - 10); i--) {
                if (c[i] < o[i]) { obLow = l[i]; obHigh = h[i]; obFound = true; break; }
              }
            }
            if (bearishBOS && lastSL) {
              var slIdx = lastSL.idx;
              for (var i = slIdx - 1; i >= Math.max(0, slIdx - 10); i--) {
                if (c[i] > o[i]) { obLow = l[i]; obHigh = h[i]; obFound = true; break; }
              }
            }

            // === HTF SMA50 (simulasi dengan SMA50 pada data yang sama) ===
            var sma50 = null;
            if (len >= 50) {
              var sum=0;
              for (var i = len-50; i < len; i++) sum += c[i];
              sma50 = sum / 50;
            }
            var trendBuy = sma50 !== null && currentClose > sma50;
            var trendSell = sma50 !== null && currentClose < sma50;

            // === RSI ===
            var rsiVal = rsi(c, 7);

            // === RETRACE CHECK ===
            var inFVG = fvgInfo.aktif && currentLow <= fvgInfo.high && currentHigh >= fvgInfo.low;
            var obTol = 0.3 / 100;
            var obZoneLow = obFound ? obLow * (1 - obTol) : 0;
            var obZoneHigh = obFound ? obHigh * (1 + obTol) : 0;
            var inOB = obFound && currentLow <= obZoneHigh && currentHigh >= obZoneLow;

            var buyOK = bullishBOS && trendBuy && fvgInfo.aktif && fvgInfo.tipe === 'BULLISH' && fvgInfo.high < (lastSH ? lastSH.price : Infinity);
            var sellOK = bearishBOS && trendSell && fvgInfo.aktif && fvgInfo.tipe === 'BEARISH' && fvgInfo.low > (lastSL ? lastSL.price : -Infinity);

            // === CONFIRMATION CANDLE (anti floating / anti SL dini) ===
            // BUY butuh candle penutupan >= candle pembukaan (momentum bullish)
            // SELL butuh candle penutupan <= candle pembukaan
            var lastCandle = c[len-1];
            var lastOpen = o[len-1];
            var confirmOK = false;
            var confirmDir = 0;
            var bullConfirm = lastCandle >= lastOpen;
            var bearConfirm = lastCandle <= lastOpen;
            // toleransi doji kecil: gunakan body vs range
            var body = Math.abs(lastCandle - lastOpen);
            var rng = Math.max(h[len-1] - l[len-1], 0.0001);
            var bodyRatio = body / rng;
            var strongConfirmBuy = bodyRatio >= 0.45;
            var strongConfirmSell = bodyRatio >= 0.45;

            // === ENTRY READY ===
            var entryReady = false;
            var entryArah = 0;
            // BUY: BOS + trend + FVG bullish + di dalam zona retrace + RSI oversold + konfirmasi bullish
            if (buyOK && inFVG && inOB && rsiVal < 40 && strongConfirmBuy) { entryReady = true; entryArah = 1; }
            if (sellOK && inFVG && inOB && rsiVal > 60 && strongConfirmSell) { entryReady = true; entryArah = -1; }

            // === PERHITUNGAN ===
            var result = {};
            result.symbol = symbol;
            result.price = currentClose;
            result.rsi = rsiVal;
            result.sma50 = sma50;
            result.trendBuy = trendBuy;
            result.trendSell = trendSell;
            result.swingHigh = lastSH ? lastSH.price : null;
            result.swingLow = lastSL ? lastSL.price : null;
            result.bullishBOS = bullishBOS;
            result.bearishBOS = bearishBOS;
            result.fvg = fvgInfo;
            result.fvgAktif = fvgInfo.aktif;
            result.ob = obFound ? { low: obLow, high: obHigh } : null;
            result.inFVG = inFVG;
            result.inOB = inOB;
            result.rsiOK_buy = rsiVal < 40;
            result.rsiOK_sell = rsiVal > 60;
            result.buyCondition = buyOK;
            result.sellCondition = sellOK;
            result.entryReady = entryReady;
            result.entryArah = entryArah;

            // HITUNG SL/TP jika entry ready
            if (entryReady) {
              var lotSize = 0.02;
              var nilaiPerPip = 0.10;
              var targetProfit = 15;
              var rrOpt = '1:4';
              var tp2Mult = 1.2;
              var atrPeriod = 14;
              var atrMargin = 0.3;

              var pipValue = nilaiPerPip * (lotSize / 0.01);
              var targetPips = targetProfit / pipValue;
              var R = rrOpt === '1:4' ? 4.0 : 3.0;
              var atrVal = atr(h, l, c, atrPeriod);
              var slPad = atrVal * atrMargin;

              // Entry di OPEN candle berikutnya = current close (simulasi)
              var entryPrice = currentClose;

              // === SL di BALIK STRUKTUR (anti SL dini) ===
              var atrVal = atr(h, l, c, atrPeriod);
              var slPad = atrVal * 0.15; // padding kecil ATR utk atasi noise
              var slPrice, tp1Price, tp2Price;
              if (entryArah === 1) {
                // BUY: SL di bawah swing low (struktur) minus padding kecil
                var strucLow = lastSL ? lastSL.price : fvgInfo.low;
                var bestLow = Math.min(fvgInfo.low, strucLow);
                slPrice = bestLow - slPad;
                // pastikan SL tidak terlalu jauh (> 2x ATR) — kalau ya, batasi
                var maxSl = Math.max(atr * 1.5, 5);
                if (Math.abs(entryPrice - slPrice) > maxSl) slPrice = entryPrice - maxSl;
                tp1Price = entryPrice + targetPips;
                tp2Price = entryPrice + targetPips * tp2Mult;
              } else {
                // SELL: SL di atas swing high + padding
                var strucHigh = lastSH ? lastSH.price : fvgInfo.high;
                var bestHigh = Math.max(fvgInfo.high, strucHigh);
                slPrice = bestHigh + slPad;
                var maxSl = Math.max(atr * 1.5, 5);
                if (Math.abs(slPrice - entryPrice) > maxSl) slPrice = entryPrice + maxSl;
                tp1Price = entryPrice - targetPips;
                tp2Price = entryPrice - targetPips * tp2Mult;
              }

              var slDist = Math.abs(entryPrice - slPrice);
              var tp1Dist = Math.abs(tp1Price - entryPrice);
              var rrActual = slDist > 0 ? (tp1Dist / slDist) : 0;

              result.entry = entryPrice;
              result.sl = slPrice;
              result.tp1 = tp1Price;
              result.tp2 = tp2Price;
              result.atr = atrVal;
              result.targetPips = targetPips;
              result.slDist = slDist;
              result.tp1Dist = tp1Dist;
              result.rrActual = rrActual;
              result.rrRequired = R;
              result.rrOK = rrActual >= R;
            }

            // Last 10 bars
            var bars = [];
            for (var i = Math.max(0, len-10); i < len; i++) {
              var d = new Date(t[i]);
              bars.push({
                time: d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0'),
                open: o[i], high: h[i], low: l[i], close: c[i]
              });
            }
            result.lastBars = bars;
            result.totalBars = len;

            return JSON.stringify(result);
          } catch(e) { return JSON.stringify({err: e.message, stack: e.stack}); }
        })()
      `}}));
    };
    ws.onmessage = (event) => {
      const m = JSON.parse(event.data);
      if (m.id === 1 && m.result) {
        const r = JSON.parse(m.result.result.value);
        if (r.err) { console.log('ERROR:', r.err); process.exit(1); }

        console.log('╔══════════════════════════════════════════════════╗');
        console.log('║   SMC BOS FVG AUTO SCALPER - ANALISIS CHART     ║');
        console.log('╚══════════════════════════════════════════════════╝');
        console.log('');
        console.log('SYMBOL      : ' + r.symbol);
        console.log('HARGA       : ' + r.price.toFixed(2));
        console.log('RSI(7)      : ' + r.rsi.toFixed(2));
        console.log('SMA50 HTF   : ' + (r.sma50 !== null ? r.sma50.toFixed(2) : 'N/A'));
        console.log('TREND HTF   : ' + (r.trendBuy ? 'BULLISH (BUY)' : r.trendSell ? 'BEARISH (SELL)' : 'NETRAL'));
        console.log('');

        console.log('─── SWING & BOS ───');
        console.log('Swing High   : ' + (r.swingHigh !== null ? r.swingHigh.toFixed(2) : 'N/A'));
        console.log('Swing Low    : ' + (r.swingLow !== null ? r.swingLow.toFixed(2) : 'N/A'));
        console.log('Bullish BOS  : ' + (r.bullishBOS ? 'YES' : 'NO'));
        console.log('Bearish BOS  : ' + (r.bearishBOS ? 'YES' : 'NO'));
        console.log('');

        console.log('─── FVG ───');
        if (r.fvgAktif) {
          console.log('FVG AKTIF    : ' + r.fvg.tipe);
          console.log('Area FVG     : ' + r.fvg.low.toFixed(2) + ' - ' + r.fvg.high.toFixed(2));
          console.log('Harga di FVG : ' + (r.inFVG ? 'YES (retrace)' : 'NO'));
        } else {
          console.log('FVG AKTIF    : TIDAK ADA');
        }
        console.log('');

        console.log('─── ORDER BLOCK ───');
        if (r.ob) {
          console.log('OB AREA      : ' + r.ob.low.toFixed(2) + ' - ' + r.ob.high.toFixed(2));
          console.log('Harga di OB  : ' + (r.inOB ? 'YES' : 'NO'));
        } else {
          console.log('OB           : TIDAK DITEMUKAN');
        }
        console.log('');

        console.log('─── RSV ───');
        console.log('RSI < 40 (BUY) : ' + (r.rsiOK_buy ? 'YES' : 'NO (RSI=' + r.rsi.toFixed(2) + ')'));
        console.log('RSI > 60 (SELL): ' + (r.rsiOK_sell ? 'YES' : 'NO (RSI=' + r.rsi.toFixed(2) + ')'));

        var buyM = (r.bullishBOS ? '✓' : '✗') + ' BOS | ' + (r.trendBuy ? '✓' : '✗') + ' TREND | ' + (r.fvgAktif && r.fvg.tipe === 'BULLISH' ? '✓' : '✗') + ' FVG | ' + (r.ob ? '✓' : '✗') + ' OB | ' + (r.rsiOK_buy ? '✓' : '✗') + ' RSI';
        var sellM = (r.bearishBOS ? '✓' : '✗') + ' BOS | ' + (r.trendSell ? '✓' : '✗') + ' TREND | ' + (r.fvgAktif && r.fvg.tipe === 'BEARISH' ? '✓' : '✗') + ' FVG | ' + (r.ob ? '✓' : '✗') + ' OB | ' + (r.rsiOK_sell ? '✓' : '✗') + ' RSI';
        console.log('');
        console.log('─── KONFLUENSI BUY ───');
        console.log('  ' + buyM);
        console.log('  KESIMPULAN: ' + (r.buyCondition ? 'MENUNGGU RETRACE' : 'BELUM TERPENUHI'));
        console.log('');
        console.log('─── KONFLUENSI SELL ───');
        console.log('  ' + sellM);
        console.log('  KESIMPULAN: ' + (r.sellCondition ? 'MENUNGGU RETRACE' : 'BELUM TERPENUHI'));
        console.log('');

        if (r.entryReady) {
          console.log('╔══════════════════════════════════════════════════╗');
          console.log('║             🔥 SINYAL ENTRY VALID              ║');
          console.log('╚══════════════════════════════════════════════════╝');
          console.log('ARAH        : ' + (r.entryArah === 1 ? 'BUY 🟢' : 'SELL 🔴'));
          console.log('ENTRY       : ' + r.entry.toFixed(2));
          console.log('STOP LOSS   : ' + r.sl.toFixed(2));
          console.log('TAKE PROFIT1: ' + r.tp1.toFixed(2));
          console.log('TAKE PROFIT2: ' + r.tp2.toFixed(2));
          console.log('');
          console.log('ATR         : ' + r.atr.toFixed(2));
          console.log('Target Pips : ' + r.targetPips.toFixed(2));
          console.log('SL Distance : ' + r.slDist.toFixed(2));
          console.log('TP1 Distance: ' + r.tp1Dist.toFixed(2));
          console.log('RR Aktual   : 1:' + r.rrActual.toFixed(2) + ' (wajib ≥ 1:' + r.rrRequired + ')');
          console.log('RR Valid    : ' + (r.rrOK ? 'YES ✅' : 'NO ❌'));
          console.log('');
          if (r.rrOK) {
            console.log('✅ SEMUA KONFLUENSI TERPENUHI');
            console.log('✅ SMC (OB) + BOS + FVG + RSI = VALID');
            console.log('✅ Entry aman dengan zero floating SL');
          } else {
            console.log('❌ RR TIDAK MEMENUHI SYARAT (1:' + r.rrRequired + ')');
            console.log('   Sinyal diabaikan untuk hindari floating');
          }
        } else {
          console.log('╔══════════════════════════════════════════════════╗');
          console.log('║         🟡 TIDAK ADA SINYAL VALID              ║');
          console.log('╚══════════════════════════════════════════════════╝');

          if (r.bullishBOS || r.bearishBOS) {
            console.log('');
            console.log('BOS SUDAH TERJADI, TAPI:');
            if (r.bullishBOS && !r.buyCondition) {
              if (!r.trendBuy) console.log('- TREND HTF tidak mendukung BUY (close < SMA50)');
              if (!r.fvgAktif || r.fvg.tipe !== 'BULLISH') console.log('- Tidak ada FVG BULLISH aktif di bawah swing high');
              if (!r.ob) console.log('- OB demand tidak ditemukan');
            }
            if (r.bearishBOS && !r.sellCondition) {
              if (!r.trendSell) console.log('- TREND HTF tidak mendukung SELL (close > SMA50)');
              if (!r.fvgAktif || r.fvg.tipe !== 'BEARISH') console.log('- Tidak ada FVG BEARISH aktif di atas swing low');
              if (!r.ob) console.log('- OB supply tidak ditemukan');
            }
            if (r.buyCondition && !r.entryReady) {
              console.log('- SEDANG MENUNGGU RETRACE ke area FVG + OB');
              console.log('- RSI belum konfirmasi (RSI=' + r.rsi.toFixed(2) + ', butuh < 40)');
            }
            if (r.sellCondition && !r.entryReady) {
              console.log('- SEDANG MENUNGGU RETRACE ke area FVG + OB');
              console.log('- RSI belum konfirmasi (RSI=' + r.rsi.toFixed(2) + ', butuh > 60)');
            }
          } else if (r.fvgAktif) {
            console.log('FVG AKTIF TAPI BOS BELUM TERJADI');
            console.log('- Tunggu BOS (break swing high/low)');
          } else if (r.swingHigh || r.swingLow) {
            console.log('Menunggu FVG terbentuk atau BOS terjadi');
            console.log('- Range harga: ' + (r.swingHigh !== null ? r.swingHigh.toFixed(2) : '?') + ' - ' + (r.swingLow !== null ? r.swingLow.toFixed(2) : '?'));
          } else {
            console.log('Data swing belum cukup, tunggu lebih banyak bar');
          }
        }

        console.log('');
        console.log('─── LAST 10 BARS ───');
        for (var i = 0; i < r.lastBars.length; i++) {
          var bar = r.lastBars[i];
          console.log('  ' + bar.time + ' O:' + bar.open.toFixed(2) + ' H:' + bar.high.toFixed(2) + ' L:' + bar.low.toFixed(2) + ' C:' + bar.close.toFixed(2));
        }

        ws.close(); process.exit(0);
      }
    };
    ws.onerror = (e) => { console.log('WS Error:', e.message); process.exit(1); };
    setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 20000);
  });
});
