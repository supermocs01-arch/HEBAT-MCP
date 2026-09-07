const http = require('http');
const fs = require('fs');
const { execFile } = require('child_process');
const PLAN_FILE = 'C:/HEBAT/overlay_plan.json';

http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    if (!t) { console.log('no chart'); process.exit(1); }
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) { return new Promise(r => { const mid = id++; const h = raw => { const resp = JSON.parse(raw.toString()); if (resp.id === mid) { ws.removeListener('message', h); r(resp.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); }); }
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    // ============ ANALYZER SMC (copy dari analyze_mtf.cjs) ============
    function smcJSON(tf) {
      return `(function(){
        try {
          var wv = window.TradingViewApi._activeChartWidgetWV.value();
          var resU = (${JSON.stringify(tf)});
          var sym = wv.symbol ? wv.symbol() : 'XAUUSD';
          var chart = wv._chartWidget;
          var pw = chart._paneWidgets._value[0];
          var bars = pw._state.m_dataSources[0]._seriesSource._data.m_bars._items;
          var n = bars.length;
          if (n < 10) return JSON.stringify({tf:${JSON.stringify(tf)}, err:'not enough bars (' + n + ')'});
          var s = Math.max(0, n - 200);
          var o=[],h=[],l=[],c=[],t=[];
          for (var i = s; i < n; i++) { var v = bars[i].value; o.push(v[1]); h.push(v[2]); l.push(v[3]); c.push(v[4]); t.push(v[0]); }
          if (c.length < 10) return JSON.stringify({tf:${JSON.stringify(tf)}, err:'not enough'});

          var len=c.length;
          function pivotH(src,left,right,idx){ if(idx<left||idx+right>=src.length) return null; for(var i=-left;i<=right;i++){if(i===0)continue;if(src[idx]<=src[idx+i])return null;} return src[idx]; }
          function pivotL(src,left,right,idx){ if(idx<left||idx+right>=src.length) return null; for(var i=-left;i<=right;i++){if(i===0)continue;if(src[idx]>=src[idx+i])return null;} return src[idx]; }
          function rsi(src,period){ if(src.length<period+1) return 50; var g=0,ls=0; for(var i=src.length-period;i<src.length;i++){var dd=src[i]-src[i-1];if(dd>0)g+=dd;else ls-=dd;} var ag=g/period,al=ls/period; return al===0?100:100-100/(1+ag/al); }
          function sma(src,period,idx){ if(idx<period-1) return null; var sum=0; for(var i=idx-period+1;i<=idx;i++) sum+=src[i]; return sum/period; }

          var P = ${(tf==='240'||tf==='1440') ? '4' : '3'};
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
          var bullStruct = shArr.length===2 && slArr.length===2 && shArr[0]>shArr[1] && slArr[0]>slArr[1];
          var bearStruct = shArr.length===2 && slArr.length===2 && shArr[0]<shArr[1] && slArr[0]<slArr[1];
          var shArrPrev = lastNOf('H',3), slArrPrev = lastNOf('L',3);
          var bullishBOS=false,bearishBOS=false,bullishCHOCH=false,bearishCHOCH=false;
          if(lastSH!==null && closeN>lastSH){
            var shPrev = shArrPrev.length>=2 ? shArrPrev[1] : (shArrPrev.length>=1?shArrPrev[0]:null);
            if(bearStruct){ bullishCHOCH=true; }
            else if(lastSHidx>=lastSLidx){ bullishCHOCH=true; }
            else if(!bullStruct || shPrev===null){ bullishBOS=true; }
          }
          if(lastSL!==null && closeN<lastSL){
            var stPrev = slArrPrev.length>=3 ? slArrPrev[1] : (slArrPrev.length>=1?slArrPrev[0]:null);
            if(bullStruct){ bearishCHOCH=true; }
            else if(lastSLidx>=lastSHidx){ bearishCHOCH=true; }
            else if(!bearStruct || stPrev===null){ bearishBOS=true; }
          }
          var choch = bullishCHOCH||bearishCHOCH;
          var bos = bullishBOS||bearishBOS;
          var close = closeN;
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
          var ob={found:false,low:0,high:0,tipe:'',dist:9999};
          var candidates=[];
          for(var i=Math.max(2,len-25); i<len-1; i++){
            if(c[i]<o[i]){
              var lo=l[i], hi=h[i];
              var dist = close>hi ? close-hi : (close<lo ? lo-close : 0);
              candidates.push({lo:lo,hi:hi,ty:'BULLISH',dist:dist,body:Math.abs(c[i]-o[i])});
            } else if(c[i]>o[i]){
              var lo=l[i], hi=h[i];
              var dist = close>hi ? close-hi : (close<lo ? lo-close : 0);
              candidates.push({lo:lo,hi:hi,ty:'BEARISH',dist:dist,body:Math.abs(c[i]-o[i])});
            }
          }
          candidates.sort(function(a,b){ return (a.dist===b.dist) ? (b.body-a.body) : (a.dist-b.dist); });
          if(candidates.length>0){ var best=candidates[0]; ob={found:true,low:best.lo,high:best.hi,tipe:best.ty,dist:best.dist}; }
          var sniper={found:false,tipe:'',lo:0,hi:0,entry:0,sl:0,tp2:0,risk:0,dist:9999};
          var ps = close>20000 ? 100 : 1;
          if(ob.found&&fvg.aktif){
            var zLo=Math.max(ob.low,fvg.low), zHi=Math.min(ob.high,fvg.high);
            if(zLo<zHi&&(ob.high-ob.low)<80*ps&&(fvg.high-fvg.low)<40*ps){
              var zrange=zHi-zLo, buf=Math.max(0.5,zrange*0.08);
              if(ob.tipe==='BULLISH'&&close>zHi){
                var risk=Math.max(1.0,zrange+buf);
                sniper={found:true,tipe:'BUY',lo:zLo,hi:zHi,entry:Math.round(zHi*10)/10,sl:Math.round((zLo-buf)*10)/10,tp2:Math.round((zHi+2*risk)*10)/10,risk:Math.round(risk*10)/10,dist:Math.round((close-zHi)*10)/10};
              }
              if(ob.tipe==='BEARISH'&&close<zLo){
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
              if(isBearOB&&c[bx]<l[bi]){bj=bx;break;}
              if(isBullOB&&c[bx]>h[bi]){bj=bx;break;}
            }
            if(bj<0) continue;
            var lo=l[bi],hi=h[bi];
            var bodyWide=(Math.abs(c[bi]-o[bi])/(h[bi]-l[bi])||0)>0.35;
            if(!bodyWide) continue;
            var touched=false;
            for(var bt=bj+1;bt<len;bt++){ if(h[bt]>=lo&&l[bt]<=hi){touched=true;break;} }
            var age=bj-bi;
            if(age>=breaker.age) continue;
            var d = close>hi ? close-hi : (close<lo ? lo-close : 0);
            if(d<breaker.dist||age<breaker.age){
              breaker={found:true,low:lo,high:hi,tipe:isBearOB?'BREAKER_BULL':'BREAKER_BEAR',dist:d,touched:touched,age:age};
            }
          }
          var lastO=o[len-1], lastC=c[len-1], lastH=h[len-1], lastL=l[len-1];
          var rng=lastH-lastL;
          var bodyRatio = rng>0 ? Math.abs(lastC-lastO)/rng : 0;
          var candleBull = lastC>lastO;
          var wickU = rng>0 ? (lastH-Math.max(lastO,lastC))/rng : 0;
          var wickD = rng>0 ? (Math.min(lastO,lastC)-lastL)/rng : 0;
          var confirmed = bodyRatio>=0.45 && Math.max(wickU,wickD)<=0.45;
          var inOB = ob.found && ob.dist===0;
          var sma20 = sma(c,20,len-1);
          var r = rsi(c,7);
          var trendBull = sma20!==null && close>sma20;
          var trendBear = sma20!==null && close<sma20;
          var dirUp = bullishBOS||bullishCHOCH;
          var dirDown = bearishBOS||bearishCHOCH;
          var sig = 'FLAT';
          var obOk = false;
          if (dirDown && ob.tipe==='BEARISH') { obOk = true; sig = bearishCHOCH ? 'SELL_CHOCH' : 'SELL_BOS'; }
          else if (dirUp && ob.tipe==='BULLISH') { obOk = true; sig = bullishCHOCH ? 'BUY_CHOCH' : 'BUY_BOS'; }
          if (sig==='FLAT') { if (ob.found) sig = ob.tipe==='BULLISH' ? 'FLAT_OB_BULL' : 'FLAT_OB_BEAR'; }
          var isReal = (sig==='SELL_CHOCH'||sig==='SELL_BOS'||sig==='BUY_CHOCH'||sig==='BUY_BOS');
          var ready = 0;
          if (isReal) ready += 40;
          if (confirmed && isReal) ready += 30;
          var obWide = ob.found && (ob.high-ob.low) > 15*ps;
          if ((inOB) && isReal && !obWide) ready += 30;
          if (ob.found && isReal && !inOB) ready -= Math.min(20, ob.dist*0.5);
          if (!isReal) ready = Math.min(ready, 15);
          if (isReal && breaker.found && !breaker.touched && breaker.dist<20*ps) {
            if (sig.indexOf('BUY')===0 && breaker.tipe==='BREAKER_BULL' && ob.tipe==='BULLISH') ready += 10;
            if (sig.indexOf('SELL')===0 && breaker.tipe==='BREAKER_BEAR' && ob.tipe==='BEARISH') ready += 10;
          }
          ready = Math.min(ready, 100);

          var fibo={found:false,leg:'',hi:0,lo:0,f236:0,f382:0,f50:0,f618:0,f786:0,pos:0,e1272:0,e1618:0,e2618:0};
          if(lastSH!==null&&lastSL!==null&&lastSH>lastSL){
            var legUp = lastSHidx>lastSLidx;
            var hiF=legUp?lastSH:lastSL, loF=legUp?lastSL:lastSH;
            var rngF=hiF-loF;
            if(rngF>0){
              fibo={found:true,leg:legUp?'UP':'DOWN',hi:hiF,lo:loF,
                f236:hiF-rngF*0.236,f382:hiF-rngF*0.382,f50:hiF-rngF*0.5,f618:hiF-rngF*0.618,f786:hiF-rngF*0.786,pos:closeN,
                e1272:legUp?loF+rngF*1.272:hiF-rngF*1.272,
                e1618:legUp?loF+rngF*1.618:hiF-rngF*1.618,
                e2618:legUp?loF+rngF*2.618:hiF-rngF*2.618};
            }
          }

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
            fvg:fvg, ob:ob, breaker:breaker, sniper:sniper, fibo:fibo, count:len});
        } catch(e){ return JSON.stringify({tf:'?', err:e.message}); }
      })()`;
    }

    // ============ PEMBACA PINE INDICATOR ============
    function pineStudyId() {
      try {
        const cfg = JSON.parse(fs.readFileSync('C:/HEBAT/config.json', 'utf8'));
        if (cfg.pineStudyId) return cfg.pineStudyId;
      } catch (e) {}
      return 'PTdIuB';
    }
    function readPine() {
      const SID = pineStudyId();
      return `(function(){
        var out={};
        try{
          var chart=window.TradingViewApi._activeChartWidgetWV.value();
          var st=null;
          try{ st=chart.getStudyById('${SID}'); }catch(e){}
          if(!st){ try{ st=chart.getStudyById('PTdIuB'); }catch(e){} }
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
          var pdLegacy=null, pdJson=null;
          col.forEach(function(l){
            if(l.t && l.t.indexOf('PINE_DATA_JSON|')===0) pdJson=l.t;
            else if(l.t && l.t.indexOf('PINE_DATA|')===0) pdLegacy=l.t;
          });
          var pd=pdLegacy || pdJson;
          var bos=labels.filter(function(l){return /^BOS|^CHOCH/.test(l.t)});
          var lines=[];
          try{ var dl=pc.dwglines.get('lines').get(false)._primitivesDataById; dl.forEach(function(l){lines.push({b2:barOf(l.x2),y:l.y1,ci:l.ci})}); lines.sort(function(a,b){return b.b2-a.b2}); }catch(e){}
          var sw=lines.slice(0,2);
          var boxes=[];
          try{ var db=pc.dwgboxes.get('boxes').get(false)._primitivesDataById; db.forEach(function(bx){boxes.push({b2:barOf(bx.x2),hi:Math.max(bx.y1,bx.y2),lo:Math.min(bx.y1,bx.y2)})}); boxes.sort(function(a,b){return b.b2-a.b2}); }catch(e){}
          out.nLabels=labels.length;
          out.nLines=lines.length;
          out.nBoxes=boxes.length;
          out.price=bars[bars.length-1].value[4];
          out.pineData=pd;
          out.bosLast=bos.slice(-6);
          out.swingsLast=sw;
          out.boxesLast=boxes.slice(0,3);
          return JSON.stringify(out);
        }catch(e){return JSON.stringify({err:e.message})}
      })()`;
    }

    function parsePineData(pd) {
      if (!pd || !pd.t) return null;
      if (pd.t.indexOf('PINE_DATA_JSON|') === 0) {
        try {
          const j = JSON.parse(pd.t.split('|')[1]);
          return { price: j.px, rsi: j.rsi, sig: j.sig, ready: j.ready, atr: j.atr, bar: pd.b, dt: pd.dt };
        } catch(e) { return null; }
      }
      const f = pd.t.split('|');
      return { price: parseFloat(f[1]), rsi: parseFloat(f[2]), sig: f[3], ready: parseInt(f[4]), atr: parseFloat(f[5]), bar: pd.b, dt: pd.dt };
    }

    ws.on('open', async () => {
      await send('Runtime.enable');
      const tfs = ['1440', '240', '60', '30', '15'];
      const results = {};
      for (const tf of tfs) {
        await send('Runtime.evaluate', { expression: `window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.setResolution('${tf}')` });
        // Tunggu bars load: poll sampai bars.size() > 100 (cukup untuk pivot detection)
        let barsOk = false;
        for (let attempt = 0; attempt < 20; attempt++) {
          await sleep(1500);
          const barsCheck = await send('Runtime.evaluate', { expression: `(function(){try{var b=window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.model().mainSeries().bars();return b.size();}catch(e){return 0;}})()`, returnByValue: true });
          const bs = parseInt(barsCheck.result.value) || 0;
          if (bs > 100) { barsOk = true; break; }
        }
        // Tunggu Pine label muncul: retry sampai ada PINE_DATA label
        let pdFinal = null;
        for (let attempt = 0; attempt < 10; attempt++) {
          const p = await send('Runtime.evaluate', { expression: readPine(), returnByValue: true });
          let pineRaw = {};
          try { pineRaw = JSON.parse(p.result.value); } catch(e) {}
          if (pineRaw.pineData && pineRaw.pineData.t) { pdFinal = pineRaw; break; }
          await sleep(2000);
        }
        const p = await send('Runtime.evaluate', { expression: readPine(), returnByValue: true });
        const a = await send('Runtime.evaluate', { expression: smcJSON(tf), returnByValue: true });
        let pine = pdFinal || {};
        try { pine = JSON.parse(p.result.value); } catch (e) { pine = pdFinal || { err: p.result.value }; }
        let an = {};
        try { an = JSON.parse(a.result.value); } catch (e) { an = { err: a.result.value }; }
        results[tf] = { pine, analyzer: an };
        const pd = parsePineData(pine.pineData);
        console.log('[' + tf + '] PINE:' + (pd ? JSON.stringify(pd) : 'none') + ' | ANALYZER: trend=' + (an.trend || '-') + ' sig=' + (an.signal || '-') + ' ready=' + (an.ready != null ? an.ready + '%' : '-') + ' candle=' + (an.candle ? an.candle.dir + an.candle.body + '%' + ' (ekor atas ' + an.candle.wickUp + '% / bawah ' + an.candle.wickDown + '%)' : '-'));
        console.log('   SMC: BOS-B=' + (an.bosB ? 'Y' : 'N') + ' BOS-S=' + (an.bosS ? 'Y' : 'N') + ' CHoCH-B=' + (an.chochB ? 'Y' : 'N') + ' CHoCH-S=' + (an.chochS ? 'Y' : 'N') + ' | OB=' + (an.ob && an.ob.found ? an.ob.tipe + ' ' + an.ob.low.toFixed(1) + '-' + an.ob.high.toFixed(1) + ' (dist ' + an.ob.dist.toFixed(1) + ')' : 'no') + (an.inOB ? ' [DI DALAM OB]' : '') + ' | FVG=' + (an.fvg && an.fvg.aktif ? an.fvg.tipe + ' ' + an.fvg.low.toFixed(1) + '-' + an.fvg.high.toFixed(1) : 'tidak ada') + (an.breaker && an.breaker.found ? ' | BRK=' + an.breaker.tipe + ' ' + an.breaker.low.toFixed(1) + '-' + an.breaker.high.toFixed(1) + (an.breaker.touched ? ' [dipakai]' : ' [fresh]') : ''));
        if (an.fibo && an.fibo.found) console.log('   FIBO: leg ' + an.fibo.leg + ' ' + an.fibo.lo.toFixed(1) + '->' + an.fibo.hi.toFixed(1) + ' | 38.2=' + an.fibo.f382.toFixed(1) + ' 50=' + an.fibo.f50.toFixed(1) + ' 61.8=' + an.fibo.f618.toFixed(1) + ' 78.6=' + an.fibo.f786.toFixed(1) + ' | EXT 127.2=' + an.fibo.e1272.toFixed(1) + ' 161.8=' + an.fibo.e1618.toFixed(1) + ' 261.8=' + an.fibo.e2618.toFixed(1) + ' | harga ' + an.fibo.pos.toFixed(1));
        if (pine.bosLast && pine.bosLast.length) console.log('   bosLast: ' + pine.bosLast.slice(-3).map(b => b.t + '@' + b.y.toFixed(1) + ' ' + b.dt).join(' | '));
        if (pine.swingsLast && pine.swingsLast.length) console.log('   swing: ' + pine.swingsLast.map(s => s.y.toFixed(1)).join(' | '));
        if (pine.boxesLast && pine.boxesLast.length) console.log('   boxes: ' + pine.boxesLast.map(bx => bx.lo.toFixed(1) + '-' + bx.hi.toFixed(1)).join(' | '));
        if (an.sniper && an.sniper.found) console.log('   SNIPER: ' + an.sniper.tipe + ' entry ' + an.sniper.entry.toFixed(1) + ' | SL ' + an.sniper.sl.toFixed(1) + ' | TP2 ' + an.sniper.tp2.toFixed(1) + ' | risk ' + an.sniper.risk.toFixed(1) + ' pt | jarak ' + an.sniper.dist.toFixed(1) + ' pt');
      }
      await send('Runtime.evaluate', { expression: `window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.setResolution('15')` });
      await sleep(4000);
      ws.close();

      // ============ SINTESIS ============
      console.log('\n===== LAPORAN GABUNGAN INDICATOR PINE + ANALYZER =====');
      const h4 = results['240'], h1 = results['60'], m15 = results['15'], d1 = results['1440'], m30 = results['30'];
      const pd4 = parsePineData(h4.pine.pineData), pd1 = parsePineData(h1.pine.pineData), pd15 = parsePineData(m15.pine.pineData), pdD = parsePineData(d1.pine.pineData), pd30 = parsePineData(m30.pine.pineData);
      const an4 = h4.analyzer, an1 = h1.analyzer, an15 = m15.analyzer, anD = d1.analyzer, an30 = m30.analyzer;

      for (const [tf, x] of [['D1', pdD], ['H4', pd4], ['H1', pd1], ['M30', pd30], ['M15', pd15]]) {
        if (x) console.log(tf + ': PINE sig=' + x.sig + ' ready=' + x.ready + ' RSI7=' + x.rsi + ' harga=' + x.price + ' (bar ' + x.bar + ' ' + x.dt + ')');
        else console.log(tf + ': PINE n/a');
      }

      const trends = {};
      for (const tf of tfs) {
        const a = results[tf].analyzer;
        trends[tf] = a && a.trend ? a.trend : '?';
      }
      const align = trends['1440'] === trends['240'] && trends['240'] === trends['60'] && trends['60'] === trends['15'] && trends['1440'] !== '?';
      const d1h4Bentur = trends['1440'] !== '?' && trends['240'] !== '?' && trends['1440'] !== trends['240'];
      console.log('\nTrend 4TF: D1=' + trends['1440'] + ' H4=' + trends['240'] + ' H1=' + trends['60'] + ' M15=' + trends['15'] + (align ? ' (SEARAH)' : ' (BENTUR)') + (d1h4Bentur ? ' | FILTER D1: H4 bertentangan dengan D1, hindari entry paksa' : ''));

      // ============ SWING LIKUIDITAS & ZONA DISKON/PREMIUM (SMC swing) ============
      console.log('\n===== SWING LIKUIDITAS & ZONA DISKON/PREMIUM =====');
      const sweepLog = [];
      for (const [tfn, key] of [['D1', '1440'], ['H4', '240'], ['H1', '60'], ['M15', '15']]) {
        const raw = (results[key] && results[key].pine) || {};
        const pdp = parsePineData(raw.pineData) || {};
        const pr = pdp.price || 0;
        let up = null, dn = null;
        (raw.bosLast || []).forEach(b => { if (b.t === 'BOS-B' && pr && b.y > pr) up = b.y; if (b.t === 'BOS-S' && pr && b.y < pr) dn = b.y; });
        if (up) sweepLog.push(tfn + ': BOS-B swept di ATAS ' + up.toFixed(1) + ' (harga ' + pr.toFixed(1) + ') -> likuiditas buy-side tersapu');
        if (dn) sweepLog.push(tfn + ': BOS-S swept di BAWAH ' + dn.toFixed(1) + ' (harga ' + pr.toFixed(1) + ') -> likuiditas sell-side tersapu');
      }
      if (sweepLog.length) sweepLog.forEach(s => console.log('  SWEEP: ' + s));
      else console.log('  SWEEP: tidak ada sapuan eksternal aktif');
      const rHi = Math.max(an4.swingHigh || 0, an1.swingHigh || 0);
      const rLo = Math.min(an4.swingLow || 1e9, an1.swingLow || 1e9);
      const zoneMid = (rHi > 0 && rLo < 1e9 && rHi > rLo) ? (rHi + rLo) / 2 : null;
      const prNow = an15.price || an1.price || 0;
      if (zoneMid) {
        const zlbl = prNow > zoneMid ? 'PREMIUM (setengah atas) - bias SELL' : 'DISKON (setengah bawah) - bias BUY';
        console.log('  RANGE H4/H1: ' + rLo.toFixed(1) + ' - ' + rHi.toFixed(1) + ' | mid ' + zoneMid.toFixed(1) + ' | harga ' + prNow.toFixed(1) + ' = ' + zlbl);
        console.log('  FILTER: FVG/OB BULLISH hanya valid jika ZONA DISKON | FVG/OB BEARISH hanya valid jika ZONA PREMIUM');
      } else console.log('  RANGE H4/H1: tidak tersedia (swing belum terbentuk)');
      if (an4.fibo && an4.fibo.found) {
        const f4 = an4.fibo;
        let fbl = '?';
        if (f4.leg === 'UP') fbl = prNow <= f4.f618 ? 'DI/DI BAWAH 61.8 = area konfluen BUY (DISKON DALAM)' : (prNow <= f4.f50 ? 'di atas 61.8, menuju DISKON (tunggu turun)' : 'di atas 50 = PREMIUM, bukan area beli');
        else fbl = prNow >= f4.f618 ? 'DI/DI ATAS 61.8 = area konfluen SELL (PREMIUM DALAM)' : (prNow >= f4.f50 ? 'di bawah 61.8, menuju PREMIUM (tunggu naik)' : 'di bawah 50 = DISKON, bukan area jual');
        console.log('  FIBO H4 (leg ' + f4.leg + ' ' + f4.lo.toFixed(1) + '->' + f4.hi.toFixed(1) + '): 38.2=' + f4.f382.toFixed(1) + ' 50=' + f4.f50.toFixed(1) + ' 61.8=' + f4.f618.toFixed(1) + ' 78.6=' + f4.f786.toFixed(1) + ' | harga ' + prNow.toFixed(1) + ' = ' + fbl);
      }

      // ============ FILTER FIBO M30 (adaptasi strategi MSNR fibo-retest) ============
      if (an30 && an30.fibo && an30.fibo.found) {
        const f30 = an30.fibo;
        const rng30 = f30.hi - f30.lo;
        if (rng30 > 0) {
          const zSellTop = f30.hi - rng30 * 0.145, zSellBot = f30.hi - rng30 * 0.25;   // zona retest sell 0.145-0.25
          const zBuyTop = f30.hi - rng30 * 0.618, zBuyBot = f30.hi - rng30 * 0.786;    // zona demand buy 0.618-0.786
          let z30 = 'di luar zona retest';
          if (prNow >= zSellBot && prNow <= zSellTop) z30 = 'DI ZONA SELL RETEST M30 (0.145-0.25) = ' + zSellTop.toFixed(1) + '-' + zSellBot.toFixed(1) + ' - kandidat SELL scalp, TUNGGU konfirmasi (PINE/CHoCH)';
          else if (prNow >= zBuyBot && prNow <= zBuyTop) z30 = 'DI ZONA DEMAND M30 (0.618-0.786) = ' + zBuyTop.toFixed(1) + '-' + zBuyBot.toFixed(1) + ' - kandidat BUY, TUNGGU konfirmasi (PINE/CHoCH)';
          else if (prNow < zBuyBot) z30 = 'DI BAWAH 0.786 M30 = oversold/breakout, zona berikutnya ' + (f30.lo + rng30 * 0.82).toFixed(1);
          else z30 = 'di atas 0.145 M30 = zona 0-0.145 (sangat dekat high), tunggu pullback';
          console.log('  FIBO M30 (leg ' + f30.leg + ' ' + f30.lo.toFixed(1) + '->' + f30.hi.toFixed(1) + '): retest-sell 0.145-0.25 = ' + zSellTop.toFixed(1) + '-' + zSellBot.toFixed(1) + ' | demand 0.618-0.786 = ' + zBuyTop.toFixed(1) + '-' + zBuyBot.toFixed(1));
          console.log('  FILTER MSNR: ' + z30);
        }
      }

      let real = {};
      for (const tf of tfs) {
        const a = results[tf].analyzer;
        const isReal = a && a.signal && /BUY|SELL/.test(a.signal);
        real[tf] = isReal ? a.signal : null;
        if (isReal) console.log('Analyzer ' + tf + ':' + a.signal.toUpperCase() + ' ready=' + a.ready + '% OB=' + (a.ob && a.ob.found ? a.ob.tipe + ' ' + a.ob.low.toFixed(1) + '-' + a.ob.high.toFixed(1) : 'no') + ' candle=' + (a.candle ? a.candle.dir + a.candle.body + '%' + ' (ekor atas ' + a.candle.wickUp + '% / bawah ' + a.candle.wickDown + '%)' : '?'));
      }

      const pine15 = pd15 ? pd15.sig : 'FLAT';
      const readyBest = Math.max(an15.ready || 0, an1.ready || 0, an4.ready || 0);

      console.log('\n===== VERDICT GABUNGAN =====');
      const d1Bias = trends['1440'];
      const d1h4Conflict = d1Bias !== '?' && trends['240'] !== '?' && d1Bias !== trends['240'];
      console.log('SYARAT KONFLIK: D1=' + d1Bias + ' vs H4=' + trends['240'] + (d1h4Conflict ? ' BENTUR -> PULLBACK H4. BUY hanya VALID di DISKON DALAM (konfluen 61.8/FVG), SELL hanya PREMIUM DALAM. Entry lawan bias di zona tengah = NO' : ' SEARAH -> bias dipakai'));
      const f4 = an4.fibo && an4.fibo.found ? an4.fibo : null;
      const diskonDalam = f4 && f4.leg === 'UP' && prNow <= f4.f618 && (f4.f618 - prNow) < 25;
      const premiumDalam = f4 && f4.leg === 'DOWN' && prNow >= f4.f618 && (prNow - f4.f618) < 25;
      const pullbackValid = d1h4Conflict && ((d1Bias === 'BULLISH' && diskonDalam) || (d1Bias === 'BEARISH' && premiumDalam));
      if (d1h4Conflict && !pullbackValid) {
        console.log('>>> NO ENTRY — D1/H4 bentur dan harga BELUM di zona konfluen dalam. TUNGGU harga masuk DISKON/PREMIUM DALAM.');
      } else if (d1h4Conflict && pullbackValid) {
        console.log('>>> PULLBACK D1 VALID — harga di zona konfluen dalam (' + (f4.leg === 'UP' ? 'DISKON ≤61.8' : 'PREMIUM ≥61.8') + '), bias D1 ' + d1Bias + '. BUY/SELL LAYAK di zona dengan konfirmasi: ' + (d1Bias === 'BULLISH' ? 'CHoCH-B M15 + PINE BUY' : 'CHoCH-S M15 + PINE SELL') + ' + candle tegas. TIDAK TUNGGU tanpa batas.');
      } else if (readyBest >= 70) {
        if (pine15 === 'BUY' || pine15 === 'SELL') {
          console.log('>>> ' + (pine15 === 'BUY' ? 'BUY' : 'SELL') + ' SETUP VALID — analyzer ready=' + readyBest + '% DAN indikator Pine M15 konfirmasi ' + pine15);
        } else {
          console.log('>>> SETUP MENDEKAT — analyzer ready=' + readyBest + '% tapi indikator Pine masih ' + pine15 + ' (tunggu plotshape SIG BUY/SELL)');
        }
      } else if (align && readyBest >= 40) {
        console.log('>>> SETUP MENDEKAT — trend searah, menunggu BOS/CHOCH + OB + konfirmasi candle (ready tertinggi ' + readyBest + '%)');
      } else {
        console.log('>>> NO ENTRY — tidak ada sinyal valid (Pine=' + pine15 + ', analyzer ready max=' + readyBest + '%). HANYA tunggu.');
      }

      // ============ PLAN LIMIT OTOMATIS (beritahu ke overlay) ============
      try {
        const HIST_FILE = 'C:/HEBAT/zona_history.json';
        let history = [];
        try { history = JSON.parse(fs.readFileSync(HIST_FILE, 'utf8')); } catch (e) {}
        const today = new Date().toISOString().slice(0, 10);
        let plan = { active: false };
        const sym = (an15 && an15.sym) || '?';
        const close = (an15 && an15.price) || 0;
        const d1Tr = trends['1440'], h4Tr = trends['240'];
        const isXau = sym.indexOf('XAU') >= 0;
        const maxDist = Math.round(close * 0.01 * 10) / 10;
        const cand = [['H4', an4], ['H1', an1], ['M15', an15]];
        let best = null;
        for (const [tfn, an] of cand) {
          if (!an) continue;
          const zones = [];
          if (an.fvg && an.fvg.aktif) zones.push({ ty: 'FVG ' + tfn, lo: an.fvg.low, hi: an.fvg.high, tipe: an.fvg.tipe });
          if (an.ob && an.ob.found) zones.push({ ty: 'OB ' + tfn, lo: an.ob.low, hi: an.ob.high, tipe: an.ob.tipe });
          for (const z of zones) {
            const zMidZ = (z.lo + z.hi) / 2;
            const zonaBenar = zoneMid ? (z.tipe === 'BULLISH' ? zMidZ <= zoneMid : zMidZ >= zoneMid) : true;
            if (!zonaBenar) continue;
            const f4b = an4 && an4.fibo && an4.fibo.found ? an4.fibo : null;
            const diDiskonDalam = f4b && f4b.leg === 'UP' && close <= f4b.f618;
            const diPremiumDalam = f4b && f4b.leg === 'DOWN' && close >= f4b.f618;
            if (z.tipe === 'BULLISH' && close > z.hi && d1Tr === 'BULLISH' && (h4Tr === 'BULLISH' || diDiskonDalam) && (close - z.hi) <= maxDist) {
              const d = close - z.hi;
              if (!best || d < best.d) best = { d: d, kind: z.ty, zone: z, bullish: true, pullback: h4Tr !== 'BULLISH' };
            } else if (z.tipe === 'BEARISH' && close < z.lo && d1Tr === 'BEARISH' && (h4Tr === 'BEARISH' || diPremiumDalam) && (z.lo - close) <= maxDist) {
              const d = close - z.lo;
              if (!best || d < best.d) best = { d: d, kind: z.ty, zone: z, bullish: false, pullback: h4Tr !== 'BEARISH' };
            }
          }
        }
        const overlap = (a, b) => a.lo <= b.hi && b.lo <= a.hi;
        if (best) {
          const srcTF = best.kind.slice(4);
          let strong = false;
          const others = cand.filter(c => c[0] !== srcTF).map(c => c[1]);
for (const o of others) {
              if (!o) continue;
              if (o.ob && o.ob.found && overlap(best.zone, o.ob)) strong = true;
              if (o.fvg && o.fvg.aktif && overlap(best.zone, o.fvg)) strong = true;
            }
            let fiboHit = null;
            for (const [tfx, anX] of cand) {
              if (!anX || !anX.fibo || !anX.fibo.found) continue;
              const lvlsF = [['50', anX.fibo.f50], ['61.8', anX.fibo.f618], ['78.6', anX.fibo.f786]];
              for (const [fk, fl] of lvlsF) if (fl >= best.zone.lo - 2 && fl <= best.zone.hi + 2) { fiboHit = { tf: tfx, key: fk, l: fl }; break; }
              if (fiboHit) break;
            }
            if (fiboHit) strong = true;
          const entry = Math.round((best.bullish ? best.zone.hi : best.zone.lo) * 10) / 10;
          let slRaw = best.bullish ? best.zone.lo - 2 : best.zone.hi + 2;
          let risk = Math.abs(entry - slRaw);
          if (risk < 10) { slRaw = best.bullish ? entry - 10 : entry + 10; risk = 10; }
          if (risk > 20) { slRaw = best.bullish ? entry - 20 : entry + 20; risk = 20; }
          const riskR = Math.round(risk * 10) / 10;
          const swingUpRaw = Math.min(an1.swingHigh || 99999, an4.swingHigh || 99999);
          const swingDnRaw = Math.max(an1.swingLow || -99999, an4.swingLow || -99999);
          const swingUp = swingUpRaw > entry + 5 ? swingUpRaw : 99999;
          const swingDn = swingDnRaw < entry - 5 ? swingDnRaw : -99999;
          let tp1 = best.bullish ? swingUp - 2 : swingDn + 2;
          if (!isFinite(tp1) || Math.abs(tp1 - entry) < 30) tp1 = best.bullish ? entry + 30 : entry - 30;
          let tp2 = best.bullish ? (an4.swingHigh > entry + 5 ? an4.swingHigh - 2 : tp1 + 10) : (an4.swingLow < entry - 5 ? an4.swingLow + 2 : tp1 - 10);
          if (Math.abs(tp2 - entry) < 40) tp2 = best.bullish ? entry + 40 : entry - 40;
          if (Math.abs(tp2 - entry) <= Math.abs(tp1 - entry)) tp2 = best.bullish ? tp1 + 10 : tp1 - 10;
          tp1 = Math.round(tp1 * 10) / 10;
          tp2 = Math.round(tp2 * 10) / 10;
          let extNote = '';
          for (const [tfx, anX] of [['H4', an4], ['H1', an1]]) {
            if (!anX || !anX.fibo || !anX.fibo.found) continue;
            const f = anX.fibo;
            const okUp = best.bullish && f.leg === 'UP' && f.e1618 > entry;
            const okDn = !best.bullish && f.leg === 'DOWN' && f.e1618 < entry;
            if (okUp || okDn) {
              extNote = ' | SWING EXT (fibo ' + tfx + '): 127.2 @ ' + f.e1272.toFixed(1) + ' | 161.8 @ ' + f.e1618.toFixed(1) + ' | 261.8 @ ' + f.e2618.toFixed(1);
              break;
            }
          }
          const rsiM = an15 ? an15.rsi : 50;
          const momentumOk = best.bullish ? rsiM >= 35 : rsiM <= 65;
          const reused = history.some(h => h.day === today && Math.abs(h.entry - entry) < 0.5);
          const sl = Math.round(slRaw * 10) / 10;
          if (reused) {
            plan = { active: true, title: (isXau ? 'XAU ' : '') + 'ZONA BEKAS ' + entry.toFixed(1) + ' (' + best.kind + ')', info: 'Zona ' + best.zone.tipe + ' ' + best.zone.lo.toFixed(1) + '-' + best.zone.hi.toFixed(1) + ' sudah dipakai & batal hari ini', sl: sl.toFixed(1), slNote: '-', tp1: '-', tp1Note: '-', tp2: '-', tp2Note: '-', syarat: 'SKIP: zona bekas tidak dipakai ulang hari ini', status: 'ZONA BEKAS - TUNGGU zona lain', catatan: 'Disiplin: jangan pasang ulang zona yang sudah kena-batal' };
          } else {
            plan = {
              active: true,
              title: (isXau ? 'XAU ' : '') + (best.bullish ? 'BUY' : 'SELL') + ' LIMIT ' + entry.toFixed(1) + ' (' + best.kind + (best.pullback ? ' - PULLBACK D1 VALID' : '') + (strong ? ' - ZONA KUAT' + (fiboHit ? ' FIBO ' + fiboHit.key : '') + ')' : ')'),
              info: 'Zona ' + best.zone.tipe + ' ' + best.zone.lo.toFixed(1) + '-' + best.zone.hi.toFixed(1) + ' | Bias D1 ' + d1Tr + (best.pullback ? ' (pullback H4, diskon dalam)' : ' searah H4') + (strong ? ' | KONFLUEN' : '') + (fiboHit ? ' | FIBO ' + fiboHit.key + ' ' + fiboHit.tf + ' @' + fiboHit.l.toFixed(1) : ''),
              sl: sl.toFixed(1), slNote: 'struktural maks 20 pips (risk ' + riskR.toFixed(1) + ')',
              tp1: tp1.toFixed(1), tp1Note: 'di bawah swing (1:3, 30-40+ pips) (' + Math.abs(tp1 - entry).toFixed(1) + ' pips)',
              tp2: tp2.toFixed(1), tp2Note: 'di bawah swing H4 (1:4, 40+ pips, situasional) (' + Math.abs(tp2 - entry).toFixed(1) + ' pips)',
              syarat: 'VALID jika: limit kena + ' + (strong ? 'BOS-' + (best.bullish ? 'B' : 'S') + ' M15 + candle tegas (konfirmasi ringan, zona kuat)' : 'PINE M15 ' + (best.bullish ? 'BUY' : 'SELL') + ' + BOS-' + (best.bullish ? 'B' : 'S') + ' H4 baru + candle tegas') + (best.pullback ? ' | PULLBACK D1: konfirmasi ' + (best.bullish ? 'CHoCH-B' : 'CHoCH-S') + ' M15 + PINE ' + (best.bullish ? 'BUY' : 'SELL') : ''),
              status: 'LIMIT BARU: menunggu kena + konfirmasi | RSI M15 ' + Math.round(rsiM) + (momentumOk ? '' : ' (arus belum balik, tunggu)'),
              catatan: 'Jika PINE FLAT saat kena: JANGAN eksekusi | SL/TP struktural, jangan kaku' + extNote
            };
          }
          history = history.filter(h => !(h.day === today && Math.abs(h.entry - entry) < 0.5));
          history.push({ day: today, entry: entry });
          fs.writeFileSync(HIST_FILE, JSON.stringify(history, null, 1));
        }
        let prevPlan = null;
        try { prevPlan = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8')); } catch (e) {}
        if (plan.active || !prevPlan || !prevPlan.active) {
          fs.writeFileSync(PLAN_FILE, JSON.stringify(plan, null, 1));
          if (plan.active && plan.title.indexOf('ZONA BEKAS') < 0) console.log('LIMIT DIPASANG KE OVERLAY: ' + plan.title);
          else if (plan.active) console.log('OVERLAY: ' + plan.title);
          else console.log('Overlay: tidak ada limit baru (status TUNGGU)');
        } else {
          console.log('Overlay: plan manual aktif dipertahankan (' + prevPlan.title + ') - scan tidak menimpa');
        }
        execFile('node', ['C:/HEBAT/overlay_position.cjs'], () => {});
      } catch (e) { console.log('Plan err: ' + e.message); }
      process.exit(0);
    });
  });
}).on('error', e => console.log(e.message));