const { execSync } = require('child_process');
console.log('=== MORNING ROUTINE - SMC SCALPING ===');

// 1. Launch TradingView
try { execSync('taskkill /f /im TradingView.exe 2>nul', { stdio:'pipe' }); } catch(e){}
setTimeout(() => {
  const exe = "C:\\Users\\Newas\\AppData\\Local\\tradingview-mcp\\TradingView.Desktop_3.3.0.7992_x64__n534cwy3pjxzj\\TradingView.exe";
  execSync(`start "" "${exe}" --remote-debugging-port=9222`, { stdio:'pipe' });
  console.log('1. TradingView launched');

  // 2. Wait, set H1, inject overlay, run analysis
  setTimeout(() => {
    const http = require('http');
    http.get('http://127.0.0.1:9222/json', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const targets = JSON.parse(d);
        const chart = targets.find(t => t.url && t.url.includes('/chart/') && !t.url.includes('doubleclick') && !t.url.includes('google'));
        if (!chart) { console.log('Chart not found'); runAnalysis(); return; }

        const WebSocket = require('ws');
        const ws = new WebSocket(chart.webSocketDebuggerUrl);
        let msgId = 1;
        function send(m, p) { return new Promise(r => { const id = msgId++; const h = (raw) => { const resp = JSON.parse(raw.toString()); if (resp.id === id) { ws.removeListener('message', h); r(resp.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); }

        ws.on('open', async () => {
          await send('Page.enable');
          await send('Runtime.enable');
          
          // 3. Set H1
          await send('Runtime.evaluate', { expression: `(function(){
            var api = window.TradingViewApi;
            api._activeChartWidgetWV.value()._chartWidget.setResolution('60');
            return 'H1 OK';
          })()` });
          console.log('2. Chart set to H1');
          
          // 4. Inject initial overlay
          await send('Runtime.evaluate', { expression: `(function(){
            var d = document.querySelector('.chart-container')||document.querySelector('[class*="chartContainer"]')||document.querySelector('.layout__area--center');
            if(!d) return;
            var r = d.getBoundingClientRect();
            document.getElementById('smc_overlay') && document.getElementById('smc_overlay').remove();
            var ov = document.createElement('div'); ov.id = 'smc_overlay';
            ov.style.cssText = 'position:fixed;top:'+(r.y+40)+'px;right:20px;z-index:9999;font-family:monospace;font-size:13px;background:rgba(0,0,0,0.85);padding:15px;border-radius:8px;border:1px solid #444;min-width:195px;';
            var t = document.createElement('div');
            t.style.cssText = 'color:#FFD700;font-weight:bold;font-size:14px;margin-bottom:8px;text-align:center;';
            t.textContent = 'PAGI REPORT';
            ov.appendChild(t);
            document.body.appendChild(ov);
          })()` });
          
          ws.close();
          console.log('3. Overlay ready');
          
          // 5. Run SMC analysis
          setTimeout(runAnalysis, 2000);
        });
      });
    }).on('error', () => { console.log('TV connection failed'); runAnalysis(); });
  }, 12000);
}, 1000);

function runAnalysis() {
  console.log('\n--- Running SMC Analysis ---');
  execSync('node C:\\HEBAT\\analyze_chart.cjs', { stdio: 'inherit' });
  console.log('\n✅ Morning routine complete. SMC Monitor aktif.');
}