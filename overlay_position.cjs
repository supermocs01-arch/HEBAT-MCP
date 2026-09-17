const http = require('http');
const fs = require('fs');

const OV = JSON.parse(fs.readFileSync('C:/HEBAT/overlay_plan.json', 'utf8'));
const P  = JSON.parse(fs.readFileSync('C:/HEBAT/posisi.json', 'utf8'));
const J  = JSON.parse(fs.readFileSync('C:/HEBAT/entry_hari.json', 'utf8'));

const D = JSON.stringify({
  pTitle: 'XAUUSD M15 • AKUN CENT 2,000 USC • SELL 4449 LIVE',
  pInfo: OV.info || '',
  currentPrice: OV.current_price || P.current_price || 4410.0,
  // LIVE posisi (dari posisi.json)
  liveActive: P.active ? true : false,
  liveDir: /SELL/i.test(P.title || '') ? 'SELL' : 'BUY',
  liveEntry: P.entry || '—',
  liveSl: P.sl || '—',
  liveTp1: P.tp1 || '—',
  liveTp2: P.tp2 || '—',
  liveTp3: P.tp3 || '—',
  liveRunner: P.tp_extend || '—',
  liveFloat: P.floating_pips || '0',
  liveStatus: P.status || '',
  jatah: J.sisa_jatah ?? '3',
  jatahLoss: J.loss_count ?? '0',
  // PLAN A (SELL - tidak ada lagi; hapus stale)
  planEntry: OV.plan_a_sell?.entry || '—',
  planSl: OV.plan_a_sell?.sl || '—',
  planTp1: OV.plan_a_sell?.tp1 || '—',
  planTp2: OV.plan_a_sell?.tp2 || '—',
  // PLAN B (BUY far-swing 4353, WATCH)
  planBEntry: OV.plan_b_buy?.entry || '—',
  planBSl: OV.plan_b_buy?.sl || '—',
  planBTp1: OV.plan_b_buy?.tp1 || '—',
  planBTp2: OV.plan_b_buy?.tp2 || '—',
  macro: OV.macro_context || []
});
const code = `(function(){
  var D = ${D};
  if(window._smcRefresh){ clearInterval(window._smcRefresh); window._smcRefresh = null; }
  while(document.getElementById('smc_overlay')) document.getElementById('smc_overlay').remove();

  var chartEl = document.querySelector('.chart-container') || document.querySelector('[class*="chartContainer"]') || document.querySelector('.layout__area--center');
  if(!chartEl) return;
  var rect = chartEl.getBoundingClientRect();

  var ov = document.createElement('div');
  ov.id = 'smc_overlay';
  ov.style.cssText = 'position:fixed;top:'+(rect.y+40)+'px;right:20px;z-index:9999;font-family:monospace;font-size:12px;background:rgba(0,0,0,0.9);padding:12px;border-radius:8px;border:1px solid #444;min-width:280px;max-width:360px;max-height:92vh;overflow-y:auto;word-wrap:break-word;';

  function el(txt, style){ var d=document.createElement('div'); d.style.cssText=style||''; if(txt!=null&&txt!='') d.innerHTML=txt; ov.appendChild(d); return d; }
  function sep(){ el('', 'border-top:1px solid #444;margin:5px 0;'); }

  el('⚡ SMC SWING PATEN v2.2', 'color:#FFD700;font-weight:bold;font-size:14px;text-align:center;');
  var clock = el('', 'color:#FFFF00;font-size:13px;text-align:center;margin-bottom:4px;'); clock.id='smc_clock';
  var sess = el('', 'font-size:12px;text-align:center;margin-bottom:6px;padding:2px;border-radius:4px;font-weight:bold;'); sess.id='smc_session';
  el('XAUUSD M15 • AKUN CENT 2,000 USC • LIVE ['+D.liveDir+']', 'color:#888;font-size:11px;text-align:center;');
  el('Current: <b style="color:#FFD700;">'+D.currentPrice.toFixed(2)+'</b> &nbsp; Float: <b style="color:#00FF00;">+'+D.liveFloat+' pip</b>', 'color:#fff;font-weight:bold;font-size:12px;text-align:center;margin-bottom:6px;');
  sep();

  // LIVE POSITION (dari posisi.json)
  if(D.liveActive){
    el('LIVE: '+D.liveDir+' '+D.liveEntry, 'color:#26A69A;font-weight:bold;font-size:12px;');
    el('SL: <b style="color:#FF5252;">'+D.liveSl+'</b> &nbsp; TP: '+D.liveTp1+' → '+D.liveTp2+' → '+D.liveTp3+' → '+D.liveRunner, 'font-size:11px;margin-top:2px;');
    el('Jatah: <b>'+D.jatah+'</b>/3 · Loss: <b>'+D.jatahLoss+'</b> · PIN: '+D.liveStatus, 'font-size:10px;color:#FFA500;');
  } else {
    el('LIVE: — (NO POSITION)', 'font-size:11px;color:#888;');
  }
  sep();

  // PLAN (A: tidak ada / B: BUY 4353) + MACRO
  if(D.planEntry && D.planEntry !== '—'){
    el('PLAN A: SELL LIMIT '+D.planEntry, 'color:#FF5252;font-weight:bold;font-size:12px;');
    el('SL <b>'+D.planSl+'</b> &nbsp; TP1 <b>'+D.planTp1+'</b> &nbsp; TP2 <b>'+D.planTp2+'</b>', 'font-size:11px;');
  } else {
    el('PLAN A: — (SELL stale dihapus)', 'color:#888;font-size:11px;');
  }
  if(D.planBEntry && D.planBEntry !== '—'){
    el('PLAN B (WATCH): BUY LIMIT '+D.planBEntry+' 0.03', 'color:#64FF64;font-weight:bold;font-size:12px;');
    el('SL <b>'+D.planBSl+'</b> &nbsp; TP1 <b>'+D.planBTp1+'</b> &nbsp; TP2 <b>'+D.planBTp2+'</b>', 'font-size:11px;');
  }
  if(D.macro && D.macro.length){
    el('MACRO (WIB):', 'color:#FF9800;font-weight:bold;font-size:11px;');
    D.macro.forEach(function(m){ el(' &bull; '+m.t+' — '+m.e, 'font-size:10px;color:#FFB74D;'); });
  }

  document.body.appendChild(ov);

  function uc(){
    var n=new Date();
    var c=document.getElementById('smc_clock');
    if(c) c.textContent=n.getHours().toString().padStart(2,'0')+':'+n.getMinutes().toString().padStart(2,'0')+' WIB';
    var hr=n.getHours(), ses, scl;
    if(hr>=5&&hr<14){ses='ASIAN';scl='#FFA500';}
    else if(hr>=14&&hr<20){ses='LONDON';scl='#FFD700';}
    else{ses='NEW YORK';scl='#4169E1';}
    var s=document.getElementById('smc_session');
    if(s){s.textContent='SESI '+ses;s.style.background=scl;s.style.color='#000';}
  }
  uc();
  window._smcRefresh=setInterval(uc,60000);
})()`;

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
    function send(m, p) {
      return new Promise(r => {
        const msgId = id++;
        const h = (raw) => { const resp = JSON.parse(raw.toString()); if (resp.id === msgId) { ws.removeListener('message', h); r(resp.result); } };
        ws.on('message', h);
        ws.send(JSON.stringify({ id: msgId, method: m, params: p || {} }));
      });
    }
    ws.on('open', async () => {
      await send('Page.enable');
      await send('Runtime.enable');
      await send('Runtime.evaluate', { expression: code });
      console.log('Overlay updated: LIVE posisi + PLAN A/B + MACRO (data nyata)');
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
