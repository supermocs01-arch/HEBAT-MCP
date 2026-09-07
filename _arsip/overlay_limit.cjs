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

      const code = `(function(){
        if(window._smcRefresh){ clearInterval(window._smcRefresh); window._smcRefresh = null; }
        while(document.getElementById('smc_overlay')) document.getElementById('smc_overlay').remove();
        var d = document.querySelector('.chart-container')||document.querySelector('[class*="chartContainer"]')||document.querySelector('.layout__area--center');
        if(!d) return;
        var rect = d.getBoundingClientRect();
        var ov = document.createElement('div');
        ov.id = 'smc_overlay';
        ov.style.cssText = 'position:fixed;top:'+(rect.y+40)+'px;right:20px;z-index:9999;font-family:monospace;font-size:12px;background:rgba(0,0,0,0.9);padding:12px;border-radius:8px;border:1px solid #444;min-width:230px;';

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
        session.style.cssText = 'font-size:12px;text-align:center;margin-bottom:6px;padding:2px;border-radius:4px;font-weight:bold;';
        session.id = 'smc_session';
        ov.appendChild(session);

        var note = document.createElement('div');
        note.style.cssText = 'color:#FFD700;font-size:12px;text-align:center;margin-bottom:4px;font-weight:bold;';
        note.textContent = 'XAUUSD 15M - SMC MTF - H4 BUY 100%';
        ov.appendChild(note);

        var lineSep = document.createElement('div');
        lineSep.style.cssText = 'border-top:1px solid #444;margin:4px 0;';
        ov.appendChild(lineSep);

        var levels = document.createElement('div');
        levels.id = 'smc_levels';
        levels.style.cssText = 'font-size:11px;line-height:1.5;';
        levels.innerHTML = '' +
          '<div style="color:#90EE90;font-weight:bold;text-align:center;">BUY LIMIT (OB M15)</div>' +
          '<div style="color:#fff;">L1: <b style="color:#00FF00;">4084</b> <span style="color:#888;">(4083-4088.6)</span></div>' +
          '<div style="color:#888;">SL 4077.5 | TP 4103.5 / 4106.5 / 4116</div>' +
          '<div style="color:#90EE90;font-weight:bold;text-align:center;margin-top:4px;">BUY LIMIT (BOS H4)</div>' +
          '<div style="color:#fff;">L2: <b style="color:#00FF00;">4078</b> <span style="color:#888;">(4077.7-4080)</span></div>' +
          '<div style="color:#888;">SL 4071.5 | TP 4097.5 / 4106.5 / 4116</div>' +
          '<div style="color:#90EE90;font-weight:bold;text-align:center;margin-top:4px;">BUY LIMIT (Demand H4)</div>' +
          '<div style="color:#fff;">L3: <b style="color:#00FF00;">4065</b> <span style="color:#888;">(4063-4066)</span></div>' +
          '<div style="color:#888;">SL 4058 | TP 4086 / 4106.5 / 4116</div>' +
          '<div style="color:#FFD700;margin-top:5px;">Konfirmasi: H1 CHoCH-B &gt; 4093.9</div>' +
          '<div style="color:#888;">H4 BUY | H1 FLAT (retest 4093.9) | M15 RSI 77</div>' +
          '<div style="color:#900;text-align:center;font-weight:bold;margin-top:4px;border-top:1px solid #333;padding-top:4px;">DISIPLIN: NO SETUP VALID = NO ENTRY</div>';
        ov.appendChild(levels);

        document.body.appendChild(ov);

        function uc(){
          var n=new Date();
          var h=n.getHours().toString().padStart(2,'0');
          var m=n.getMinutes().toString().padStart(2,'0');
          document.getElementById('smc_clock').textContent=h+':'+m+' WIB';
          var hr=n.getHours();
          var ses,scl;
          if(hr>=6&&hr<10){ses='PAGI';scl='#FFD700';}
          else if(hr>=10&&hr<15){ses='SIANG';scl='#FFA500';}
          else if(hr>=15&&hr<18){ses='SORE';scl='#FF6347';}
          else{ses='MALAM';scl='#4169E1';}
          document.getElementById('smc_session').textContent='SESI '+ses;
          document.getElementById('smc_session').style.background=scl;
          document.getElementById('smc_session').style.color='#000';
          document.getElementById('smc_title').textContent='ENTRY';
        }
        uc();
        window._smcRefresh = setInterval(uc,60000);
      })()`;

      await send('Runtime.evaluate', { expression: code });
      console.log('Overlay ENTRY updated dengan BUY LIMIT L1 4084 | L2 4078 | L3 4065 (MTF)');
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });