const http = require('http');
const fs = require('fs');

const OV = JSON.parse(fs.readFileSync('C:/HEBAT/overlay_plan.json', 'utf8'));
const P  = JSON.parse(fs.readFileSync('C:/HEBAT/posisi.json', 'utf8'));

// === Extract posisi data (flat) ===
const positions = OV.positions || {};
const e1 = positions.entry_1_jumat_4449 || {};
const e2 = positions.entry_2_senin_4414 || {};
const e3 = positions.entry_3_senin_4380 || {};
const total = positions.total || {};

// === Extract TP optimal (flat) ===
const tpE1 = OV.TP_optimal_per_entry?.['entry_1_4449_0.15_lot_jumat'] || {};
const tpE2 = OV.TP_optimal_per_entry?.['entry_2_4414_0.10_lot_senin'] || {};
const tpE3 = OV.TP_optimal_per_entry?.['entry_3_4380_0.10_lot_senin_SELL_STOP'] || {};

// === Extract aggregated TP (flat) ===
const aggTP = OV.aggregated_TP_plan_7_layer || {};

// === Extract alert levels (flat) ===
const alerts = OV.alert_levels || {};

const D = JSON.stringify({
  pTitle: 'XAUUSD - 7 LAYER SELL SAMPAI TP 4.200',
  pInfo: OV.info || '',
  currentPrice: e1.current || 4410.0,
  // Entry 1 (Jumat 4449)
  e1Entry: e1.entry || '4.449',
  e1Lot: e1.lot || '0.15',
  e1Float: e1.floating_pips || '+39',
  e1Usd: e1.floating_USC || '+5.85',
  e1Sl: e1.SL || '4.470',
  e1Tp1: tpE1.TP_rekomendasi?.TP1?.level || '4.353',
  e1Tp2: tpE1.TP_rekomendasi?.TP2?.level || '4.310',
  e1Tp3: tpE1.TP_rekomendasi?.TP3?.level || '4.280',
  e1Runner: tpE1.TP_rekomendasi?.RUNNER?.level || '4.200',
  // Entry 2 (Senin 4414)
  e2Entry: e2.entry || '4.414',
  e2Lot: e2.lot || '0.10',
  e2Float: e2.floating_pips || '+4',
  e2Usd: e2.floating_USC || '+0.40',
  e2Sl: e2.SL || '4.460',
  e2Tp1: tpE2.TP_rekomendasi?.TP1?.level || '4.353',
  e2Tp2: tpE2.TP_rekomendasi?.TP2?.level || '4.280',
  e2Tp3: tpE2.TP_rekomendasi?.TP3?.level || '4.213',
  e2Runner: tpE2.TP_rekomendasi?.RUNNER?.level || '4.200',
  // Entry 3 (Senin 4380)
  e3Entry: e3.entry || '4.380',
  e3Lot: e3.lot || '0.10',
  e3Float: e3.floating_pips || '-30',
  e3Usd: e3.floating_USC || '-3.00',
  e3Sl: e3.SL || '4.434',
  e3Tp1: tpE3.TP_rekomendasi?.TP1?.level || '4.310',
  e3Tp2: tpE3.TP_rekomendasi?.TP2?.level || '4.250',
  e3Tp3: tpE3.TP_rekomendasi?.TP3?.level || '4.200',
  e3Runner: tpE3.TP_rekomendasi?.RUNNER?.level || '4.150',
  // Total
  totalLayer: total.total_layer || '7',
  totalLot: total.total_lot || '0.35',
  totalFloat: total.floating_pips || '+13',
  totalUsd: total.floating_USC || '+3.25',
  // Aggregated TP
  tp1Level: aggTP['TP1_4.353']?.level || '4.353',
  tp1Lot: aggTP['TP1_4.353']?.close_lot_total || '0.11',
  tp1Usd: aggTP['TP1_4.353']?.profit_locked || '+8.81',
  tp2Level: aggTP['TP2_4.310']?.level || '4.310',
  tp2Lot: aggTP['TP2_4.310']?.close_lot_total || '0.105',
  tp2Usd: aggTP['TP2_4.310']?.profit_locked || '+12.16',
  tp3Level: aggTP['TP3_4.280']?.level || '4.280',
  tp3Lot: aggTP['TP3_4.280']?.close_lot_total || '0.045',
  tp3Usd: aggTP['TP3_4.280']?.profit_locked || '+7.08',
  tp4Level: aggTP['TP4_4.250']?.level || '4.250',
  tp4Lot: aggTP['TP4_4.250']?.close_lot_total || '0.03',
  tp4Usd: aggTP['TP4_4.250']?.profit_locked || '+3.90',
  tp5Level: aggTP['TP5_4.213']?.level || '4.213',
  tp5Lot: aggTP['TP5_4.213']?.close_lot_total || '0.015',
  tp5Usd: aggTP['TP5_4.213']?.profit_locked || '+3.02',
  tp6Level: aggTP['TP6_4.200']?.level || '4.200',
  tp6Lot: aggTP['TP6_4.200']?.close_lot_total || '0.025',
  tp6Usd: aggTP['TP6_4.200']?.profit_locked || '+3.50',
  // Total potential
  totalPotential: OV.total_aggregated_profit_7_layer?.potential_full_TP_cascade_7_layer?.grand_total_potential || '+39.79'
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
  el('XAUUSD M15 • AKUN CENT 2,000 USC • '+D.totalLayer+' LAYER', 'color:#888;font-size:11px;text-align:center;');
  el('Current: <b style="color:#FFD700;">'+D.currentPrice.toFixed(2)+'</b> &nbsp; Float: <b style="color:#00FF00;">+'+D.totalFloat+' pip</b> = <b style="color:#00FF00;">+'+D.totalUsd+' USC</b>', 'color:#fff;font-weight:bold;font-size:12px;text-align:center;margin-bottom:6px;');
  sep();

  // Entry 1
  el('ENTRY 1 - 3 layer @0.05', 'color:#26A69A;font-weight:bold;font-size:12px;');
  el('Entry: <b>'+D.e1Entry+'</b> &nbsp; Lot: <b>'+D.e1Lot+'</b> &nbsp; SL: <b style="color:#FF5252;">'+D.e1Sl+'</b>', 'font-size:11px;margin-top:2px;');
  el('Float: <b style="color:#00FF00;">+'+D.e1Float+' pip</b> = <b style="color:#00FF00;">+'+D.e1Usd+' USC</b>', 'font-size:11px;color:#00FF00;');
  el('TP: '+D.e1Tp1+' → '+D.e1Tp2+' → '+D.e1Tp3+' → '+D.e1Runner, 'font-size:10px;color:#42A5F5;');
  sep();

  // Entry 2
  el('ENTRY 2 - 2 layer @0.05', 'color:#26A69A;font-weight:bold;font-size:12px;');
  el('Entry: <b>'+D.e2Entry+'</b> &nbsp; Lot: <b>'+D.e2Lot+'</b> &nbsp; SL: <b style="color:#FF5252;">'+D.e2Sl+'</b>', 'font-size:11px;margin-top:2px;');
  el('Float: <b style="color:#00FF00;">+'+D.e2Float+' pip</b> = <b style="color:#00FF00;">+'+D.e2Usd+' USC</b>', 'font-size:11px;color:#00FF00;');
  el('TP: '+D.e2Tp1+' → '+D.e2Tp2+' → '+D.e2Tp3+' → '+D.e2Runner, 'font-size:10px;color:#42A5F5;');
  sep();

  // Entry 3
  el('ENTRY 3 - SELL STOP 2 layer', 'color:#FFD700;font-weight:bold;font-size:12px;');
  el('Entry: <b>'+D.e3Entry+'</b> &nbsp; Lot: <b>'+D.e3Lot+'</b> &nbsp; SL: <b style="color:#FF5252;">'+D.e3Sl+'</b>', 'font-size:11px;margin-top:2px;');
  el('Float: <b style="color:#FFA500;">'+D.e3Float+' pip</b> = <b style="color:#FFA500;">'+D.e3Usd+' USC</b>', 'font-size:11px;color:#FFA500;');
  el('TP: '+D.e3Tp1+' → '+D.e3Tp2+' → '+D.e3Tp3+' → '+D.e3Runner, 'font-size:10px;color:#42A5F5;');
  sep();

  // Aggregated TP
  el('AGGREGATED TP', 'color:#AB47BC;font-weight:bold;font-size:12px;');
  el(D.tp1Level+' ('+D.tp1Lot+' lot) | '+D.tp2Level+' ('+D.tp2Lot+' lot) | '+D.tp3Level+' ('+D.tp3Lot+' lot)', 'font-size:10px;');
  el(D.tp4Level+' ('+D.tp4Lot+' lot) | '+D.tp5Level+' ('+D.tp5Lot+' lot) | '+D.tp6Level+' ('+D.tp6Lot+' lot)', 'font-size:10px;');
  el('Total: <b style="color:#FFD700;">'+D.totalPotential+' USC</b>', 'font-size:11px;color:#FFD700;text-align:center;margin-top:4px;');

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
      console.log('Overlay v2.2 updated: 7 LAYER SELL sampai TP 4.200');
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
