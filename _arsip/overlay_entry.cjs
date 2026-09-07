const http = require('http');
const fs = require('fs');
let plan = { active: false };
try { plan = JSON.parse(fs.readFileSync('C:/HEBAT/overlay_plan.json', 'utf8')); } catch (e) {}
let entryHari = { entry_ke: 0, sisa_jatah: 3 };
try { entryHari = JSON.parse(fs.readFileSync('C:/HEBAT/entry_hari.json', 'utf8')); } catch (e) {}
try {
  const pos = JSON.parse(fs.readFileSync('C:/HEBAT/posisi.json', 'utf8'));
  if (pos && pos.active) plan = pos;
} catch (e) {}
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
        var wv = window.TradingViewApi._activeChartWidgetWV.value();
        var sym = wv.symbol();
        var isBtc = sym.indexOf('BTC')>=0;
        var price = 0;
        try { var bb = wv._chartWidget.model().mainSeries().bars(); price = bb.valueAt(bb.size()-1)[4]; } catch(e){}
        var d = document.querySelector('.chart-container')||document.querySelector('[class*="chartContainer"]')||document.querySelector('.layout__area--center');
        if(!d) return;
        var rect = d.getBoundingClientRect();
        var ov = document.createElement('div');
        ov.id = 'smc_overlay';
        ov.style.cssText = 'position:fixed;top:'+(rect.y+40)+'px;right:20px;z-index:9999;font-family:monospace;font-size:11px;background:rgba(0,0,0,0.9);padding:0;border-radius:0;border:1px solid #555;width:300px;height:300px;overflow:hidden;box-sizing:border-box;';

        var title = document.createElement('div');
        title.style.cssText = 'color:#FFD700;font-weight:bold;font-size:13px;margin:4px 0;text-align:center;';
        title.id = 'smc_title';
        title.textContent = 'ENTRY';
        ov.appendChild(title);

        var clock = document.createElement('div');
        clock.style.cssText = 'color:#FFFF00;font-size:11px;text-align:center;';
        clock.id = 'smc_clock';
        ov.appendChild(clock);

        var session = document.createElement('div');
        session.style.cssText = 'font-size:10px;text-align:center;margin:2px 0 3px;padding:2px 6px;font-weight:bold;display:block;width:100%;box-sizing:border-box;border-radius:0;';
        session.id = 'smc_session';
        ov.appendChild(session);

        var note = document.createElement('div');
        note.style.cssText = 'color:#FFD700;font-size:11px;text-align:center;margin:2px 0;font-weight:bold;';
        note.textContent = 'AKUN $12 (1,200 USC) - SURVIVAL AGRESIF | Lot 0.01, 1 entry';
        ov.appendChild(note);

        var status = document.createElement('div');
        status.style.cssText = 'font-size:11px;text-align:center;margin:2px 0 3px;color:#00FF00;font-weight:bold;';
        status.id = 'smc_status';
        status.textContent = (isBtc ? 'BTC ' + price.toFixed(0) : 'XAU ' + price.toFixed(1)) + ' | PINE FLAT | NO ENTRY';
        ov.appendChild(status);

        var lineSep = document.createElement('div');
        lineSep.style.cssText = 'border-top:1px solid #555;margin:3px 0;';
        ov.appendChild(lineSep);

        var wk = document.createElement('div');
        wk.id = 'smc_weekly';
        wk.style.cssText = 'font-size:10px;margin:2px 4px;';
        wk.innerHTML = '' +
          '<div style="color:#fff;font-weight:bold;margin-bottom:2px;">PATEN (RR user):</div>' +
          '<div style="color:#FF6347;">SL struktural <b>maks 20 pips</b></div>' +
          '<div style="color:#00FF00;">TP1 <b>30-40+ pips</b> (1:3) | TP2 <b>40+ pips</b> (1:4, situasional)</div>' +
          '<div style="color:#888;">Target: $12 → $120 | 1-3 entry/hari, 2 loss = stop</div>';
        ov.appendChild(wk);

        var line = document.createElement('div');
        line.style.cssText = 'border-top:1px solid #555;margin:3px 0;';
        ov.appendChild(line);

        var levels = document.createElement('div');
        levels.id = 'smc_levels';
        levels.style.cssText = 'font-size:11px;margin:0 4px;';
        var PLAN = ${JSON.stringify(plan)};
        if (PLAN && PLAN.active) {
          var entryP = String(PLAN.title).match(/(\d+\.\d+)/);
          var entryTxt = entryP ? entryP[1] : '0';
          levels.innerHTML =
            '<div style="color:#FFD700;font-weight:bold;text-align:center;">' + PLAN.title + '</div>' +
            '<div style="color:#888;text-align:center;margin-top:1px;">' + PLAN.info + '</div>' +
            '<div style="color:#fff;text-align:center;margin:3px 0;font-size:14px;">ENTRY: <span style="color:#FFD700;font-weight:bold;background:#222;padding:0 4px;">' + entryTxt + '</span></div>' +
            '<div style="color:#fff;text-align:center;">SL: <span style="color:#FF6347;">' + PLAN.sl + '</span> | TP1: <span style="color:#00FF00;">' + PLAN.tp1 + '</span> | TP2: <span style="color:#00FF00;">' + PLAN.tp2 + '</span></div>' +
            (PLAN.swingExt ? '<div style="color:#E6E6FA;text-align:center;margin-top:2px;font-size:10px;">' + PLAN.swingExt + '</div>' : '') +
            '<div style="color:#FFD700;margin-top:3px;">' + PLAN.syarat + '</div>' +
            '<div style="color:#00FF00;margin-top:2px;">Status: ' + PLAN.status + '</div>' +
            (PLAN.catatan ? '<div style="color:#fff;font-size:10px;margin-top:3px;">' + PLAN.catatan + '</div>' : '') +
            '<div style="color:#900;text-align:center;font-weight:bold;margin-top:3px;">DISIPLIN: konfirmasi dulu</div>';
        } else {
          levels.innerHTML =
            '<div style="color:#888;text-align:center;padding-top:50px;">NO PLAN - TUNGGU</div>';
        }
        ov.appendChild(levels);

        var foot = document.createElement('div');
        foot.style.cssText = 'color:#777;font-size:9px;text-align:center;margin-top:3px;border-top:1px solid #555;padding-top:2px;';
        foot.textContent = 'PATEN: SL max 20 | TP1 1:3 | TP2 1:4 | TRADINGVIEW DESKTOP';
        ov.appendChild(foot);

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
      console.log('Overlay terpasang - PATEN: SL struktural maks 20 pips | TP1 30-40+ (1:3) | TP2 40+ (1:4, situasional)');
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });