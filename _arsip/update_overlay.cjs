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
        if(window._smcTimer){ clearInterval(window._smcTimer); window._smcTimer = null; }
        if(window._smcTimer2){ clearInterval(window._smcTimer2); window._smcTimer2 = null; }
        if(window._smcRefresh){ clearInterval(window._smcRefresh); window._smcRefresh = null; }
        while(document.getElementById('smc_overlay')) document.getElementById('smc_overlay').remove();
        var d = document.querySelector('.chart-container')||document.querySelector('[class*="chartContainer"]')||document.querySelector('.layout__area--center');
        if(!d) return;
        var rect = d.getBoundingClientRect();
        var old = document.getElementById('smc_overlay');
        if(old) old.remove();

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
        session.style.cssText = 'font-size:12px;text-align:center;margin-bottom:6px;padding:2px;border-radius:4px;font-weight:bold;';
        session.id = 'smc_session';
        ov.appendChild(session);

        var note = document.createElement('div');
        note.style.cssText = 'color:#FFD700;font-size:12px;text-align:center;margin-bottom:4px;font-weight:bold;';
        note.textContent = 'AKUN 1,500 USC - TUNGGU POI';

        var lineSep = document.createElement('div');
        lineSep.style.cssText = 'border-top:1px solid #444;margin:4px 0;';
        ov.appendChild(lineSep);

        var wk = document.createElement('div');
        wk.id = 'smc_weekly';
        wk.style.cssText = 'font-size:11px;margin-top:4px;';
        wk.innerHTML = '' +
          '<div style="color:#fff;font-weight:bold;margin-bottom:3px;">📅 TARGET MINGGUAN</div>' +
          '<div style="color:#FFD700;">Target: <b>+5,000 USC</b></div>' +
          '<div style="color:#00FF00;">Progress: <b id="smc_prog">0</b> USC</div>' +
          '<div style="color:#888;">Sisa: <span id="smc_sisa">5,000</span> USC</div>';
        ov.appendChild(wk);
        ov.appendChild(note);

        var line = document.createElement('div');
        line.style.cssText = 'border-top:1px solid #444;margin:4px 0;';
        ov.appendChild(line);

var levels = document.createElement('div');
        levels.id = 'smc_levels';
        levels.style.cssText = 'font-size:11px;';
        levels.innerHTML = '' +
          '<div style="color:#FFD700;font-weight:bold;text-align:center;">TUNGGU SETUP BARU</div>' +
          '<div style="color:#888;text-align:center;margin-top:2px;">BUY 4052 TUTUP (-4.2pt) | M15 CHoCH-S + OB bear</div>' +
          '<div style="color:#888;margin-top:4px;">SMC terakhir: H4 bear | H1 bull | M15 bear</div>' +
          '<div style="color:#FFD700;margin-top:3px;">Syarat entry berikut:</div>' +
          '<div style="color:#888;">BOS/CHoCH + OB searah + candle ≥0.45 + RR 1:3</div>' +
          '<div style="color:#333;margin-top:4px;border-top:1px solid #333;padding-top:4px;">Pantau: demand H1 4045-4057 | supply M15 4046-4054</div>' +
          '<div style="color:#900;text-align:center;font-weight:bold;margin-top:4px;">DISIPLIN: NO SETUP VALID = NO ENTRY</div>';
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
        window._smcRefreshId = setInterval(uc,60000);
      })()`;

      await send('Runtime.evaluate', { expression: code });
      console.log('Overlay updated: BUY LIMIT 4052 | SL 4042 | TP 4082 (RR 1:3 pas)');
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
