const http = require('http');

// Analisis Multi-Timeframe (H4 + H1 + M15) via CDP
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const targets = JSON.parse(d);
    const chart = targets.find(t => t.url && t.url.includes('/chart/'));
    if (!chart) { console.log('no chart'); process.exit(1); }
    const WebSocket = require('ws');
    const ws = new WebSocket(chart.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) { return new Promise(r => { const mid = id++; const h = raw => { const resp = JSON.parse(raw.toString()); if (resp.id === mid) { ws.removeListener('message', h); r(resp.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); }); }
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    function smcJSON(tf) {
      return `(function(){
        try {
          var wv = window.TradingViewApi._activeChartWidgetWV.value();
          var resU = (${JSON.stringify(tf)});
          var model = wv._chartWidget.model();
          var sym = model.mainSeries().symbol();
          var b = model.mainSeries().bars();
          var n = b.size();
          var s = Math.max(0, n - 200);
          var o=[],h=[],l=[],c=[],t=[];
          for (var i = s; i < n; i++) { var v = b.valueAt(i); if(v){o.push(v[1]);h.push(v[2]);l.push(v[3]);c.push(v[4]);t.push(v[0]);} }
          if (c.length < 10) return JSON.stringify({tf:${JSON.stringify(tf)}, err:'not enough'});

          var len=c.length;

          function pivotH(src,left,right,idx){
            if(idx<left||idx+right>=src.length) return null;
            for(var i=-left;i<=right;i++){if(i===0)continue;if(src[idx]<=src[idx+i])return null;}
            return src[idx];
          }
          function pivotL(src,left,right,idx){
            if(idx<left||idx+right>=src.length) return null;
            for(var i=-left;i<=right;i++){if(i===0)continue;if(src[idx]>=src[idx+i])return null;}
            return src[idx];
          }
          function rsi(src,period){
            if(src.length<period+1) return 50;
            var g=0,ls=0;
            for(var i=src.length-period;i<src.length;i++){var dd=src[i]-src[i-1];if(dd>0)g+=dd;else ls-=dd;}
            var ag=g/period,al=ls/period;
            return al===0?100:100-100/(1+ag/al);
          }
          function sma(src,period,idx){
            if(idx<period-1) return null;
            var sum=0; for(var i=idx-period+1;i<=idx;i++) sum+=src[i];
            return sum/period;
          }

          var P = ${tf==='240' ? '4' : '3'};
          // struktur: urutan swing demi waktu {t,pr,ty}
          var structs=[];
          for(var i=P;i<len-P;i++){
            var phh=pivotH(h,P,P,i), pll=pivotL(l,P,P,i);
            if(phh!==null) structs.push({t:i,pr:phh,ty:'H'});
            if(pll!==null) structs.push({t:i,pr:pll,ty:'L'});
          }
          structs.sort(function(a,b){return a.t-b.t;});
          function lastTwoOf(ty){ var a=[]; for(var k=structs.length-1;k>=0&&a.length<2;k--){ if(structs[k].ty===ty) a.push(structs[k].pr); } return a; }
          function lastNOf(ty,n){ var a=[]; for(var k=structs.length-1;k>=0&&a.length<n;k--){ if(structs[k].ty===ty) a.push(structs[k].pr); } return a; }
          var lastSH=null,lastSL=null,lastSHidx=-1,lastSLidx=-1;
          for(var k=structs.length-1;k>=0;k--){
            if(structs[k].ty==='H'&&lastSH===null){lastSH=structs[k].pr;lastSHidx=structs[k].t;}
            if(structs[k].ty==='L'&&lastSL===null){lastSL=structs[k].pr;lastSLidx=structs[k].t;}
          }
          var shArr=lastTwoOf('H'), slArr=lastTwoOf('L');
          var closeN=c[len-1];
          var bullStruct = shArr.length===2 && slArr.length===2 && shArr[0]>shArr[1] && slArr[0]>slArr[1]; // HH & HL
          var bearStruct = shArr.length===2 && slArr.length===2 && shArr[0]<shArr[1] && slArr[0]<slArr[1]; // LH & LL

          // CHoCH memakai swing high/low TERAKHIR; BOS memakai swing kedua-terakhir (searah trend mapan)
          var shArrPrev = lastNOf('H',3), slArrPrev = lastNOf('L',3);
          var bullishBOS=false,bearishBOS=false,bullishCHOCH=false,bearishCHOCH=false;
          // break atas (>swing high)
          if(lastSH!==null && closeN>lastSH){
            var shPrev = shArrPrev.length>=2 ? shArrPrev[1] : (shArrPrev.length>=1?shArrPrev[0]:null);
            if(bearStruct){ bullishCHOCH=true; }       // break naik saat struktur turun = CHoCH reversal naik
            else if(lastSHidx>=lastSLidx){ bullishCHOCH=true; } // high terakhir setelah low → naik mulai
            else if(!bullStruct || shPrev===null){ bullishBOS=true; } // masih struktur naik / flat
          }
          // break bawah (< swing low)
          if(lastSL!==null && closeN<lastSL){
            var stPrev = slArrPrev.length>=3 ? slArrPrev[1] : (slArrPrev.length>=1?slArrPrev[0]:null);
            if(bullStruct){ bearishCHOCH=true; }       // break turun saat struktur naik = CHOS reversal turun
            else if(lastSLidx>=lastSHidx){ bearishCHOCH=true; }
            else if(!bearStruct || stPrev===null){ bearishBOS=true; }
          }
          // fallback: jika break tanpa konteks jelas ikuti trend mayor dari sma
          var choch = bullishCHOCH||bearishCHOCH;
          var bos = bullishBOS||bearishBOS;
          var close = closeN;

          // FVG
          var fvg = {aktif:false, tipe:'', low:0, high:0};
          for(var idx=len-3; idx>=Math.max(2,len-15); idx--){
            if(h[idx-1]<l[idx+1]){
              var mit=false;
              for(var j=idx+2;j<len;j++){ if(h[j]>=h[idx-1]&&l[j]<=l[idx+1]){mit=true;break;} }
              if(!mit){ fvg={aktif:true,tipe:'BULLISH',low:h[idx-1],high:l[idx+1]}; break; }
            }
            if(l[idx-1]>h[idx+1]){
              var mit=false;
              for(var j=idx+2;j<len;j++){ if(h[j]>=h[idx+1]&&l[j]<=l[idx-1]){mit=true;break;} }
              if(!mit){ fvg={aktif:true,tipe:'BEARISH',low:h[idx+1],high:l[idx-1]}; break; }
            }
          }

          // OB: cari yang PALING AKTIF (harga di dalam / terdekat) di 25 candle, pilih yang paling tebal
          var ob={found:false,low:0,high:0,tipe:'',dist:9999};
          var candidates=[];
          for(var i=Math.max(2,len-25); i<len-1; i++){
            if(c[i]<o[i]){ // bullish OB (up-close, jadi demand)
              var lo=l[i], hi=h[i];
              var dist = close>hi ? close-hi : (close<lo ? lo-close : 0); // 0 = harga di dalam
              candidates.push({lo:lo,hi:hi,ty:'BULLISH',dist:dist,body:Math.abs(c[i]-o[i])});
            } else if(c[i]>o[i]){ // bearish OB (supply)
              var lo=l[i], hi=h[i];
              var dist = close>hi ? close-hi : (close<lo ? lo-close : 0);
              candidates.push({lo:lo,hi:hi,ty:'BEARISH',dist:dist,body:Math.abs(c[i]-o[i])});
            }
          }
          candidates.sort(function(a,b){ return (a.dist===b.dist) ? (b.body-a.body) : (a.dist-b.dist); });
          if(candidates.length>0){
            var best=candidates[0];
            ob={found:true,low:best.lo,high:best.hi,tipe:best.ty,dist:best.dist};
          }

          // SNIPER ENTRY (esensi order block): irisan OB x FVG + entry di garis batas sisi datang + SL ketat luar zona
          var sniper={found:false,tipe:'',lo:0,hi:0,entry:0,sl:0,tp2:0,risk:0,dist:9999};
          var ps = close>20000 ? 100 : 1;
          if(ob.found&&fvg.aktif){
            var zLo=Math.max(ob.low,fvg.low), zHi=Math.min(ob.high,fvg.high);
            if(zLo<zHi&&(ob.high-ob.low)<80*ps&&(fvg.high-fvg.low)<40*ps){
              var zrange=zHi-zLo, buf=Math.max(0.5,zrange*0.08);
              if(ob.tipe==='BULLISH'&&close>zHi){ // harga datang dari atas -> buy limit di batas atas zona
                var risk=Math.max(1.0,zrange+buf);
                sniper={found:true,tipe:'BUY',lo:zLo,hi:zHi,entry:Math.round(zHi*10)/10,sl:Math.round((zLo-buf)*10)/10,tp2:Math.round((zHi+2*risk)*10)/10,risk:Math.round(risk*10)/10,dist:Math.round((close-zHi)*10)/10};
              }
              if(ob.tipe==='BEARISH'&&close<zLo){ // harga datang dari bawah -> sell limit di batas bawah zona
                var risk2=Math.max(1.0,zrange+buf);
                sniper={found:true,tipe:'SELL',lo:zLo,hi:zHi,entry:Math.round(zLo*10)/10,sl:Math.round((zHi+buf)*10)/10,tp2:Math.round((zLo-2*risk2)*10)/10,risk:Math.round(risk2*10)/10,dist:Math.round((zLo-close)*10)/10};
              }
            }
          }
          var breaker={found:false,low:0,high:0,tipe:'',dist:9999,touched:false,age:99};
          for(var bi=Math.max(2,len-25); bi<len-2; bi++){
            var isBullOB=c[bi]<o[bi], isBearOB=c[bi]>o[bi];
            if(!isBullOB&&!isBearOB) continue;
            var bj=-1;
            for(var bx=bi+1;bx<len;bx++){
              if(isBearOB&&c[bx]<l[bi]){bj=bx;break;}   // close di bawah zona supply
              if(isBullOB&&c[bx]>h[bi]){bj=bx;break;}   // close di atas zona demand
            }
            if(bj<0) continue;
            var lo=l[bi],hi=h[bi];
            // cek bar yang mem-break: body harus menembus; close sudah menjamin body (bukan ekor)
            var bodyWide=(Math.abs(c[bi]-o[bi])/(h[bi]-l[bi])||0)>0.35;
            if(!bodyWide) continue;
            // mitigasi sentuhan: cek apakah zona sudah disentuh ulang setelah break
            var touched=false;
            for(var bt=bj+1;bt<len;bt++){ if(h[bt]>=lo&&l[bt]<=hi){touched=true;break;} }
            var age=bj-bi;
            if(age>=breaker.age) continue; // prefer breaker paling baru
            var d = close>hi ? close-hi : (close<lo ? lo-close : 0);
            if(d<breaker.dist||age<breaker.age){
              breaker={found:true,low:lo,high:hi,tipe:isBearOB?'BREAKER_BULL':'BREAKER_BEAR',dist:d,touched:touched,age:age};
            }
          }

          // KONFIRMASI CANDLE: bodyRatio bar terakhir (arah candle)
          var lastO=o[len-1], lastC=c[len-1], lastH=h[len-1], lastL=l[len-1];
          var rng=lastH-lastL;
          var bodyRatio = rng>0 ? Math.abs(lastC-lastO)/rng : 0;
          var candleBull = lastC>lastO;
          var wickU = rng>0 ? (lastH-Math.max(lastO,lastC))/rng : 0;
          var wickD = rng>0 ? (Math.min(lastO,lastC)-lastL)/rng : 0;
          var confirmed = bodyRatio>=0.45 && Math.max(wickU,wickD)<=0.45;

          // poin jarak harga ke OB (untuk decision)
          var inOB = ob.found && ob.dist===0;

          var sma20 = sma(c,20,len-1);
          var r = rsi(c,7);
          var trendBull = sma20!==null && close>sma20;
          var trendBear = sma20!==null && close<sma20;

          // sinyal gabungan: BOS/CHoCH + OB searah + konfirmasi candle
          var dirUp = bullishBOS||bullishCHOCH;
          var dirDown = bearishBOS||bearishCHOCH;
          var sig = 'FLAT';
          var obOk = false;
          if (dirDown && ob.tipe==='BEARISH') { obOk = true; sig = bearishCHOCH ? 'SELL_CHOCH' : 'SELL_BOS'; }
          else if (dirUp && ob.tipe==='BULLISH') { obOk = true; sig = bullishCHOCH ? 'BUY_CHOCH' : 'BUY_BOS'; }
          // FLAT tapi OB aktif mendekati -> potensi
          if (sig==='FLAT') {
            if (ob.found) sig = ob.tipe==='BULLISH' ? 'FLAT_OB_BULL' : 'FLAT_OB_BEAR';
          }
          // skor kesiapan 0-100: hanya sinyal asli + konfirmasi candle + harga di OB (OB yang wajar lebarnya)
          var isReal = (sig==='SELL_CHOCH'||sig==='SELL_BOS'||sig==='BUY_CHOCH'||sig==='BUY_BOS');
          var ready = 0;
          if (isReal) ready += 40;
          if (confirmed && isReal) ready += 30;
          // OB dianggap "in" hanya jika zona cukup sempit (≤15 pt) dan harga di dalamnya
          var obWide = ob.found && (ob.high-ob.low) > 15*ps;
          if ((inOB) && isReal && !obWide) ready += 30;
          if (ob.found && isReal && !inOB) ready -= Math.min(20, ob.dist*0.5);
          // apa pun kasusnya, tanpa sinyal valid tak boleh ready tinggi
          if (!isReal) ready = Math.min(ready, 15);
          // konfluensi breaker block searah (penguat, bukan pemicu - esensi sniper tetap)
          if (isReal && breaker.found && !breaker.touched && breaker.dist<20*ps) {
            if (sig.indexOf('BUY')===0 && breaker.tipe==='BREAKER_BULL' && ob.tipe==='BULLISH') ready += 10;
            if (sig.indexOf('SELL')===0 && breaker.tipe==='BREAKER_BEAR' && ob.tipe==='BEARISH') ready += 10;
          }
          ready = Math.min(ready, 100);

          return JSON.stringify({tf:resU, sym:sym, price:close, rsi:r, sma20:sma20,
            trend: trendBear?'BEARISH':(trendBull?'BULLISH':'NETRAL'),
            swingHigh:lastSH, swingLow:lastSL,
            bosB:bullishBOS, bosS:bearishBOS, chochB:bullishCHOCH, chochS:bearishCHOCH,
            signal:sig, obOK:obOk, inOB:inOB,
            candle:{body:Math.round(bodyRatio*100), dir:candleBull?'BULL':'BEAR', ok:confirmed,
              wickOk:Math.max(wickU,wickD)<=0.45,
              wickUp:Math.round(wickU*100),
              wickDown:Math.round(wickD*100)},
            ready:Math.round(ready),
            fvg:fvg, ob:ob, breaker:breaker, sniper:sniper, count:len});
        } catch(e){ return JSON.stringify({tf:'?', err:e.message}); }
      })()`;
    }

    ws.on('open', async () => {
      await send('Page.enable');
      await send('Runtime.enable');
      const tfs = ['240','60','15'];
      const results = {};
      for (const tf of tfs) {
        await send('Runtime.evaluate', { expression: `window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.setResolution('${tf}')` });
        await sleep(3500);
        var r = await send('Runtime.evaluate', { expression: smcJSON(tf), returnByValue: true });
        let val = r.result.result ? r.result.result.value : JSON.parse(r.result.value);
        try { val = JSON.parse(val); } catch(e) {}
        results[tf] = val;
        console.log('['+tf+']', JSON.stringify(val));
      }
      // restore H1
      await send('Runtime.evaluate', { expression: `window.TradingViewApi._activeChartWidgetGate.value()._chartWidget.setResolution('60')` });
      ws.close();
      // summary
      console.log('\n===== MTF SUMMARY =====');
      for (const tf of tfs) {
        const x = results[tf];
        if (x && !x.err) {
          console.log(tf+' : trend='+x.trend+' | Signal='+(x.signal||'-').toUpperCase()+' | OB='+(x.ob.found?x.ob.tipe+'@'+x.ob.low.toFixed(2)+'-'+x.ob.high.toFixed(2):'no')+' | inOB='+(x.inOB?'Y':'N')+' | Cndl='+(x.candle?x.candle.dir+''+(x.candle.body)+'%'+(x.candle.ok?' ✓':' ✗'):'?')+' | Ready='+(x.ready!=null?x.ready+'%':'?')+' | FVG='+(x.fvg.aktif?x.fvg.tipe:'-')+' | RSI='+(x.rsi!=null?x.rsi.toFixed(1):'?')+(x.breaker&&x.breaker.found?' | BRK='+x.breaker.tipe+'@'+x.breaker.low.toFixed(2)+'-'+x.breaker.high.toFixed(2)+(x.breaker.touched?' [Touched]':' [Fresh]'):'')+(x.sniper&&x.sniper.found?' | SNIPER='+x.sniper.tipe+' entry '+x.sniper.entry.toFixed(2)+' SL '+x.sniper.sl.toFixed(2)+' TP2 '+x.sniper.tp2.toFixed(2)+' (RR2)':' | SNIPER=-'));
        }
        else console.log(tf+' : err');
      }
      // ===== VERDICT MULTI-TF =====
      const h4=results['240'], h1=results['60'], m15=results['15'];
      if (h4 && h1 && m15 && !h4.err && !h1.err && !m15.err) {
        console.log('\n===== VERDICT OTOMATIS =====');
        const trendAlign = (h4.trend===h1.trend && h1.trend===m15.trend);
        console.log('- Align trend 3TF: ' + (trendAlign ? 'SEARAH ('+h4.trend+')' : 'BENTUR (H4='+h4.trend+', H1='+h1.trend+', M15='+m15.trend+')'));
        console.log('- Signal confirms (M15): ' + (m15.signal && m15.signal!=='FLAT' ? m15.signal.toUpperCase() : 'FLAT/ngga jelas'));
        console.log('- Candle konfirmasi M15: ' + (m15.candle && m15.candle.ok ? 'OK body '+m15.candle.body+'%' : 'BELUM (body '+(m15.candle?m15.candle.body+'%':'?')+')'));
        console.log('- Ready M15: ' + m15.ready + '% | H1: ' + h1.ready + '% | H4: ' + h4.ready + '%');
        const best = m15.ready>=70 && h1.ready>=40;
        const worst = m15.ready<40 && h1.ready<40;        let verdict = 'TUNGGU - belum ada setup valid (NO BOS/CHoCH+OB+confirm)';
        if (worst) verdict = '🚫 NO ENTRY - tidak ada sinyal valid. HANYA tunggu.';
        else if (best) verdict = '✅ SETUP VALID terdeteksi! Konsultasikan arahan + level entry.';
        else verdict = '⏳ SETUP MENDEKAT - pantau zona OB + konfirmasi candle.';
        console.log('>>> ' + verdict);
      }
      process.exit(0);
    });
  });
}).on('error', e => console.log(e.message));