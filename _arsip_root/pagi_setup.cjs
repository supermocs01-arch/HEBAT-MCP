const http = require('http');
const { exec } = require('child_process');

async function main() {
  console.log('=== PAGI SETUP ===');
  
  // 1. Kill existing & launch TradingView
  exec('taskkill /f /im TradingView.exe 2>nul', () => {
    setTimeout(() => {
      const exe = "C:\\Users\\Newas\\AppData\\Local\\tradingview-mcp\\TradingView.Desktop_3.3.0.7992_x64__n534cwy3pjxzj\\TradingView.exe";
      exec(`start "" "${exe}" --remote-debugging-port=9222`, () => {
        console.log('TradingView launched');
        setTimeout(runAnalysis, 12000);
      });
    }, 3000);
  });
}

function runAnalysis() {
  // Health check
  http.get('http://127.0.0.1:9222/json', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      const targets = JSON.parse(d);
      const chart = targets.find(t => t.url && t.url.includes('/chart/') && !t.url.includes('doubleclick') && !t.url.includes('google'));
      if (!chart) { console.log('Chart not found'); return; }
      
      const WebSocket = require('ws');
      const ws = new WebSocket(chart.webSocketDebuggerUrl);
      let id = 1;
      function send(m, p) { return new Promise(r => { const msgId = id++; const h = (raw) => { const resp = JSON.parse(raw.toString()); if (resp.id === msgId) { ws.removeListener('message', h); r(resp.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: msgId, method: m, params: p || {} })); }); }
      
      ws.on('open', async () => {
        await send('Page.enable');
        await send('Runtime.enable');
        
        // Set to H1
        await send('Runtime.evaluate', { expression: `(function(){
          var api = window.TradingViewApi;
          var wv = api._activeChartWidgetWV.value();
          wv._chartWidget.setResolution('60');
          return 'H1 set';
        })()` });
        console.log('H1 activated');
        await new Promise(r => setTimeout(r, 3000));
        
        // Get data
        const r = await send('Runtime.evaluate', { expression: `(function(){
          var api = window.TradingViewApi;
          var wv = api._activeChartWidgetWV.value();
          var model = wv._chartWidget.model();
          var series = model.mainSeries();
          try {
            var bars = series.bars();
            if (!bars || !bars.size) return JSON.stringify({err:'no bars'});
            var c = bars.size();
            var o=[],h=[],l=[],cl=[],t=[];
            for (var i=0; i<c && i<30; i++) {
              var b = bars.valueAt(i);
              if(b){o.push(b.open);h.push(b.high);l.push(b.low);cl.push(b.close);t.push(b.time);}
            }
            return JSON.stringify({count:c,open:o,high:h,low:l,close:cl,time:t});
          } catch(e) { return JSON.stringify({err:e.message}); }
        })()` });
        
        const data = JSON.parse(r.result.value);
        if (data.err || data.close.length < 10) {
          console.log('Data insufficient:', data.err || data.close.length + ' bars');
          injectOverlay(null);
          ws.close(); return;
        }
        
        // Analysis
        var close = data.close, high = data.high, low = data.low, open = data.open;
        var price = close[close.length-1];
        var sma20 = close.slice(-20).reduce((a,b)=>a+b,0) / Math.min(20,close.length);
        var trend = price > sma20 ? 'BULLISH' : 'BEARISH';
        
        var gains=0,losses=0;
        for(var i=Math.max(1,close.length-7); i<close.length; i++) {
          var d = close[i]-close[i-1]; if(d>0) gains+=d; else losses-=d;
        }
        var rs = gains/7/(losses/7||0.001);
        var rsi = 100 - 100/(1+rs);
        
        var swingH=null, swingL=null;
        for(var i=2;i<close.length-2;i++){
          if(high[i]>high[i-1]&&high[i]>high[i-2]&&high[i]>high[i+1]&&high[i]>high[i+2]) swingH=high[i];
          if(low[i]<low[i-1]&&low[i]<low[i-2]&&low[i]<low[i+1]&&low[i]<low[i+2]) swingL=low[i];
        }
        
        var bosBull = swingH && high[high.length-1] > swingH;
        var osBear = swingL && low[low.length-1] < swingL;
        
        var fvg = null;
        for(var i=1;i<close.length-1;i++){
          if(high[i] < low[i+1]) fvg={type:'BULLISH',from:high[i],to:low[i+1]};
          if(low[i] > high[i+1]) fvg={type:'BEARISH',from:high[i+1],to:low[i]};
        }
        
        console.log('\n=== SMC ANALYSIS ===');
        console.log('Price:', price.toFixed(2));
        console.log('Trend:', trend, '| SMA20:', sma20.toFixed(2));
        console.log('RSI(7):', rsi.toFixed(2));
        console.log('Swing H:', swingH, '| Swing L:', swingL);
        console.log('Bullish BOS:', bosBull ? 'YES' : 'NO');
        console.log('Bearish BOS:', osBear ? 'YES' : 'NO');
        if(fvg) console.log('FVG:', fvg.type, fvg.from.toFixed(2), '-', fvg.to.toFixed(2));
        else console.log('FVG: NONE');
        
        var report = {
          price: price.toFixed(2), sma: sma20.toFixed(2), trend: trend, rsi: rsi.toFixed(2),
          swingH: swingH, swingL: swingL, bosBull: bosBull, bosBear: osBear,
          fvg: fvg ? fvg.type + ' ' + fvg.from.toFixed(2) + '-' + fvg.to.toFixed(2) : 'NONE',
          setup: 'NO ENTRY - WAIT BOS'
        };
        
        if (bosBull && fvg && fvg.type === 'BULLISH') report.setup = 'BUY SNIPER: wait retrace to FVG ' + fvg.from.toFixed(2) + '-' + fvg.to.toFixed(2);
        if (osBear && fvg && fvg.type === 'BEARISH') report.setup = 'SELL SNIPER: wait retrace to FVG ' + fvg.from.toFixed(2) + '-' + fvg.to.toFixed(2);
        
        injectOverlay(report);
        console.log('\nSETUP:', report.setup);
        ws.close();
      });
    });
  }).on('error', e => { console.log('TradingView not connected:', e.message); injectOverlay(null); });
}

function injectOverlay(report) {
  const WebSocket = require('ws');
  http.get('http://127.0.0.1:9222/json', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      const targets = JSON.parse(d);
      const chart = targets.find(t => t.url && t.url.includes('/chart/') && !t.url.includes('doubleclick') && !t.url.includes('google'));
      if (!chart) return;
      const ws = new WebSocket(chart.webSocketDebuggerUrl);
      let id = 1;
      function send(m, p) { return new Promise(r => { const msgId = id++; const h = (raw) => { const resp = JSON.parse(raw.toString()); if (resp.id === msgId) { ws.removeListener('message', h); r(resp.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: msgId, method: m, params: p || {} })); }); }
      ws.on('open', async () => {
        await send('Page.enable');
        await send('Runtime.enable');
        
        var overlayCode = report ? `(function(){var l=[
{p:${report.swingH||'---'},la:'SWING H ${report.swingH||'---'}',c:'#FF0000'},
{p:${report.price},la:'HARGA ${report.price}',c:'#FFFF00'},
{p:${report.swingL||'---'},la:'SWING L ${report.swingL||'---'}',c:'#00FF00'}
];
var p=${report.price},sh=${report.swingH||'null'},sl=${report.swingL||'null'};
var entry='',slv='',tp1='',tp2='';
// Default BUY levels (can be adjusted)
entry=(p*1).toFixed(2);
var d=document.querySelector('.chart-container')||document.querySelector('[class*="chartContainer"]')||document.querySelector('.layout__area--center');
if(!d)return;
var r=d.getBoundingClientRect();
var o=document.getElementById('smc_overlay');if(o)o.remove();
var ov=document.createElement('div');ov.id='smc_overlay';
ov.style.cssText='position:fixed;top:'+(r.y+40)+'px;right:20px;z-index:9999;font-family:monospace;font-size:13px;background:rgba(0,0,0,0.85);padding:12px;border-radius:8px;border:1px solid #444;min-width:195px;';
var t=document.createElement('div');t.style.cssText='color:#FFD700;font-weight:bold;font-size:14px;margin-bottom:8px;text-align:center;';t.textContent='PAGI REPORT';ov.appendChild(t);
var items=[{la:'Harga : ${report.price}',c:'#FFFF00'},{la:'Trend : ${report.trend}',c:'${report.trend==="BULLISH"?"#00FF00":"#FF0000"}'},{la:'RSI(7) : ${report.rsi}',c:'#888'},{la:'BOS : ${report.bosBull?"✅ BULLISH":""} ${report.bosBear?"✅ BEARISH":""} ${!report.bosBull&&!report.bosBear?"❌ NONE":""}',c:'#888'},{la:'FVG : ${report.fvg}',c:'#00BFFF'},{la:'Setup: ${report.setup}',c:'#FFD700'}];
items.forEach(function(v){var r=document.createElement('div');r.style.cssText='display:flex;padding:2px 0;border-bottom:1px solid #333;';var sp=document.createElement('span');sp.style.cssText='color:'+v.c+';font-weight:bold;font-size:11px;';sp.textContent=v.la;r.appendChild(sp);ov.appendChild(r);});
document.body.appendChild(ov);})()` : `(function(){
var d=document.querySelector('.chart-container')||document.querySelector('[class*="chartContainer"]')||document.querySelector('.layout__area--center');
if(!d)return;
var r=d.getBoundingClientRect();
var o=document.getElementById('smc_overlay');if(o)o.remove();
var ov=document.createElement('div');ov.id='smc_overlay';
ov.style.cssText='position:fixed;top:'+(r.y+40)+'px;right:20px;z-index:9999;font-family:monospace;font-size:13px;background:rgba(0,0,0,0.85);padding:15px;border-radius:8px;border:1px solid #444;min-width:195px;';
var t=document.createElement('div');t.style.cssText='color:#FF6347;font-weight:bold;font-size:14px;text-align:center;';t.textContent='NO DATA - TV READY';
ov.appendChild(t);document.body.appendChild(ov);})()`;
        
        await send('Runtime.evaluate', { expression: overlayCode });
        console.log('Overlay injected');
        ws.close();
      });
    });
  }).on('error', () => {});
}

main();
