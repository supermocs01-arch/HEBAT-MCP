const http = require('http');
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const targets = JSON.parse(d);
    const chart = targets.find(t => t.url && t.url.includes('/chart/') && !t.url.includes('doubleclick') && !t.url.includes('google'));
    if (!chart) { console.log('Chart not found'); process.exit(1); }
    const WebSocket = require('ws');
    const ws = new WebSocket(chart.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) { return new Promise(r => { const msgId = id++; const h = (raw) => { const resp = JSON.parse(raw.toString()); if (resp.id === msgId) { ws.removeListener('message', h); r(resp.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: msgId, method: m, params: p || {} })); }); }
    ws.on('open', async () => {
      await send('Page.enable');
      await send('Runtime.enable');

      // Step 1: Kill only our own overlay timers, not TradingView's
      const clean = `(function(){
        if(window._smcRefreshId){ clearInterval(window._smcRefreshId); window._smcRefreshId = null; }
        if(window._smcTimer){ clearInterval(window._smcTimer); window._smcTimer = null; }
        if(window._smcTimer2){ clearInterval(window._smcTimer2); window._smcTimer2 = null; }
        if(window._smcRefresh){ clearInterval(window._smcRefresh); window._smcRefresh = null; }
        // Remove all overlays
        while(document.getElementById('smc_overlay')) document.getElementById('smc_overlay').remove();
      })()`;
      await send('Runtime.evaluate', { expression: clean });
      await new Promise(r => setTimeout(r, 500));

      // Step 2: Inject fresh overlay - completely static, NO timers
      const code = `(function(){
        var d = document.querySelector('.chart-container')||document.querySelector('[class*="chartContainer"]')||document.querySelector('.layout__area--center');
        if(!d) return;
        var rect = d.getBoundingClientRect();

        var ov = document.createElement('div');
        ov.id = 'smc_overlay';
        ov.style.cssText = 'position:fixed;top:'+(rect.y+40)+'px;right:20px;z-index:9999;font-family:monospace;font-size:13px;background:rgba(0,0,0,0.85);padding:12px;border-radius:8px;border:1px solid #444;min-width:195px;';

        var title = document.createElement('div');
        title.style.cssText = 'color:#FFD700;font-weight:bold;font-size:14px;margin-bottom:4px;text-align:center;';
        title.id = 'smc_title';
        title.textContent = 'ENTRY';
        ov.appendChild(title);

        var clock = document.createElement('div');
        clock.style.cssText = 'color:#FFFF00;font-size:13px;text-align:center;margin-bottom:4px;';
        clock.id = 'smc_clock';
        ov.appendChild(clock);

        var session = document.createElement('div');
        session.style.cssText = 'font-size:12px;text-align:center;margin-bottom:6px;padding:2px;border-radius:4px;font-weight:bold;color:#000;';
        session.id = 'smc_session';
        ov.appendChild(session);

        var line = document.createElement('div');
        line.style.cssText = 'border-top:1px solid #444;margin:4px 0;';
        ov.appendChild(line);

        var levels = document.createElement('div');
        levels.id = 'smc_levels';
        levels.style.cssText = 'font-size:11px;';
        levels.innerHTML = '<div style="color:#888;">NO DATA</div>';
        ov.appendChild(levels);

        document.body.appendChild(ov);

        // Update clock+session every 60s, never touch title
        function tick() {
          var n = new Date();
          document.getElementById('smc_clock').textContent = n.getHours().toString().padStart(2,'0') + ':' + n.getMinutes().toString().padStart(2,'0') + ' WIB';
          var hr = n.getHours(), ses, scl;
          if(hr>=6&&hr<10){ses='PAGI';scl='#FFD700';}
          else if(hr>=10&&hr<15){ses='SIANG';scl='#FFA500';}
          else if(hr>=15&&hr<18){ses='SORE';scl='#FF6347';}
          else{ses='MALAM';scl='#4169E1';}
          var se = document.getElementById('smc_session');
          se.textContent = 'SESI ' + ses;
          se.style.background = scl;
        }
        tick();
        window._smcRefreshId = setInterval(tick, 60000);
      })()`;

      await send('Runtime.evaluate', { expression: code });
      console.log('✅ Overlay permanent - NO timers');
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
