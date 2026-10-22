const http = require('http');
const fs = require('fs');

const OV = JSON.parse(fs.readFileSync('C:/HEBAT/overlay_plan.json', 'utf8'));
const P  = JSON.parse(fs.readFileSync('C:/HEBAT/posisi.json', 'utf8'));
const J  = JSON.parse(fs.readFileSync('C:/HEBAT/entry_hari.json', 'utf8'));

// Label akun dibaca dari risk_calculator.json (sumber kebenaran) - jangan hardcode
let AKUN = 'AKUN STANDARD';
try {
  const R = JSON.parse(fs.readFileSync('C:/HEBAT/risk_calculator.json', 'utf8'));
  const a = R.account || {};
  const brk = (a.broker || '').toUpperCase();
  const cur = a.currency === 'IDR' ? 'IDR' : (a.currency || 'USD');
  const modal = a.modal_idr && cur === 'IDR'
    ? 'Rp' + Number(a.modal_idr).toLocaleString('id-ID')
    : (a.modal_usd_estimate ? '$' + a.modal_usd_estimate : '');
  AKUN = [brk, cur, modal].filter(Boolean).join(' ') || 'AKUN STANDARD';
} catch (e) { /* fallback label lama */ }

const evGuard = require('./event_guard.cjs');

// MT5 REAL-TIME (22 Okt): posisi & pending langsung dari bridge snapshot
// -> entryan yang benar-benar ada di MT5 tampil otomatis, bukan dari file manual
let MT5 = { positions: [], orders: [], account: null };
try {
  const S = JSON.parse(fs.readFileSync('C:/HEBAT/runtime/mt5_snapshot.json', 'utf8'));
  if (S.ok) MT5 = { positions: S.positions || [], orders: S.orders || [], account: S.account || null };
} catch (e) {}

// Label live & harga = dari MT5 kalau ada (biar tidak stale), fallback posisi.json
const mt5Bid = (() => { try { const t = JSON.parse(fs.readFileSync('C:/HEBAT/runtime/mt5_snapshot.json', 'utf8')).tick; return t ? (t.bid + t.ask) / 2 : 0; } catch { return 0; } })();
let liveLabel, currentPriceLive;
if (MT5.positions.length) {
  const dirs = MT5.positions.map(p => p.type);
  const uni = dirs.every(d => d === 'SELL') ? 'SELL' : (dirs.every(d => d === 'BUY') ? 'BUY' : 'MIX');
  liveLabel = 'MT5 [' + uni + ' x' + dirs.length + ']';
  currentPriceLive = mt5Bid;
} else if (MT5.account) {
  liveLabel = 'MT5 [NO POSITION]';
  currentPriceLive = mt5Bid;
}

// RISK + EVENT (20 Okt): tampilkan risiko posisi vs batas 2% dan countdown event
let riskLine = '', riskLvl = 0;
try {
  const R = JSON.parse(fs.readFileSync('C:/HEBAT/risk_calculator.json', 'utf8'));
  const maxUsd = Number((R.risk_management || {}).max_risk_per_trade_usd) || 30;
  const oz = Number((R.lot_calculation || {}).contract_size_oz) || 100;
  const modalUsd = Number((R.account || {}).modal_usd_estimate) || 1500;
  // 22 Okt: kalau MT5 punya posisi, risiko dihitung DARI MT5 (bukan file manual)
  if (MT5.positions.length) {
    let usd = 0, lots = 0, pipsSum = 0;
    MT5.positions.forEach(p => {
      const dist = Math.abs((p.price_open || 0) - (p.sl || 0));
      if (dist > 0) usd += (p.volume || 0) * oz * dist;
      lots += (p.volume || 0);
      pipsSum += dist;
    });
    if (usd > 0) {
      const avgPips = pipsSum / MT5.positions.length;
      const pct = (usd / modalUsd * 100).toFixed(1);
      riskLine = 'RISK (MT5): ' + lots.toFixed(2) + ' lot x avg ' + avgPips.toFixed(1) + ' = $' + usd.toFixed(1) + ' (' + pct + '% modal, batas $' + maxUsd + ')';
      riskLvl = usd > maxUsd ? 2 : (usd > maxUsd * 0.6 ? 1 : 0);
    }
  } else {
  const lots = Array.isArray(P.layers) && P.layers.length
    ? P.layers.reduce((s, l) => s + (Number(l.lot) || 0), 0)
    : (Number(P.lot) || (P.active ? 0.01 : 0));
  const pips = Math.abs((Number(P.entry) || 0) - (Number(P.sl) || 0));
  if (P.active && lots && pips) {
    const usd = Math.round(lots * oz * pips);
    const pct = (usd / modalUsd * 100).toFixed(0);
    riskLine = 'RISK: ' + lots.toFixed(2) + ' lot x ' + pips.toFixed(1) + ' = $' + usd + ' (' + pct + '% modal, batas $' + maxUsd + ')';
    riskLvl = usd > maxUsd ? 2 : (usd > maxUsd * 0.6 ? 1 : 0);
  }
  }
} catch (e) {}

const evList = evGuard.upcoming(6).map(e => ({ t: e.title, ts: e.ts, block: e.block }));
const evWin = evGuard.load().windowMinutes;
const evText = evGuard.text();

const D = JSON.stringify({
  akun: AKUN,
  pTitle: 'XAUUSD M15 • ' + AKUN + ' • ' + (P.active ? (/SELL/i.test(P.title || '') ? 'SELL' : 'BUY') + ' LIVE' : 'NO POSITION'),
  pInfo: OV.info || '',
  currentPrice: currentPriceLive || P.current_price || OV.current_price || 4155.5,
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
  macro: OV.macro_context || [],
  // WATCHLIST / STATUS (overlay_plan.json)
  watchTitle: OV.title || '',
  watchStatus: OV.status || '',
  watchSyarat: OV.syarat || '',
  riskLine: riskLine,
  riskLvl: riskLvl,
  evList: evList,
  evWin: evWin,
  evText: evText,
  mt5Acct: MT5.account ? (MT5.account.login + ' ' + MT5.account.currency) : '',
  mt5Equity: MT5.account ? MT5.account.equity : 0,
  mt5Profit: MT5.account ? MT5.account.profit : 0,
  mt5LiveLabel: liveLabel || (P.active ? (/SELL/i.test(P.title || '') ? 'LIVE SELL (file)' : 'LIVE BUY (file)') : 'NO POSITION'),
  mt5Positions: MT5.positions.map(p => ({
    t: p.ticket, dir: p.type, vol: p.volume, entry: p.price_open, sl: p.sl, tp: p.tp,
    pnl: Math.round(p.profit), cmt: (p.comment || '').slice(0, 24)
  })),
  mt5Orders: MT5.orders.map(o => ({
    t: o.ticket, dir: o.type, vol: o.volume_current, entry: o.price_open, sl: o.sl, tp: o.tp,
    cmt: (o.comment || '').slice(0, 24)
  }))
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
  el('XAUUSD M15 • ' + (D.mt5Acct ? 'MT5 ' + D.mt5Acct : (D.akun || 'AKUN STANDARD')) + ' • ' + D.mt5LiveLabel, 'color:#888;font-size:11px;text-align:center;');
  el('Current: <b style="color:#FFD700;">' + D.currentPrice.toFixed(2) + '</b> &nbsp; ' + (D.mt5Acct
    ? 'P/L: <b style="color:' + (D.mt5Profit >= 0 ? '#00FF00' : '#FF5252') + ';">' + (D.mt5Profit>=0?'+':'') + Math.round(D.mt5Profit).toLocaleString('id-ID') + '</b> ' + (D.mt5Acct.match(/IDR/) ? 'Rp' : '')
    : 'Float: <b style="color:#00FF00;">+' + D.liveFloat + ' pip</b>'), 'color:#fff;font-weight:bold;font-size:12px;text-align:center;margin-bottom:6px;');
  if(D.riskLine){
    var rc = D.riskLvl>=2 ? '#FF5252' : (D.riskLvl>=1 ? '#FFA500' : '#66BB6A');
    el(D.riskLine, 'color:'+rc+';font-size:10px;text-align:center;margin-bottom:4px;font-weight:bold;');
  }
  var evEl = el(D.evText || '', 'color:#FFB74D;font-size:10px;text-align:center;margin-bottom:4px;');
  evEl.id = 'smc_event';
  sep();

  // LIVE fallback (posisi.json) - hanya kalau MT5 tidak punya posisi
  if(!D.mt5Positions.length){
    if(D.liveActive){
      el('LIVE: '+D.liveDir+' '+D.liveEntry, 'color:#26A69A;font-weight:bold;font-size:12px;');
      el('SL: <b style="color:#FF5252;">'+D.liveSl+'</b> &nbsp; TP: '+D.liveTp1+' → '+D.liveTp2+' → '+D.liveTp3+' → '+D.liveRunner, 'font-size:11px;margin-top:2px;');
      el('Jatah: <b>'+D.jatah+'</b>/3 · Loss: <b>'+D.jatahLoss+'</b> · PIN: '+D.liveStatus, 'font-size:10px;color:#FFA500;');
    } else {
      el('LIVE: — (NO POSITION)', 'font-size:11px;color:#888;');
    }
    sep();
  }

  // PLAN (A/B) + MACRO
  if(D.planEntry && D.planEntry !== '—'){
    el('PLAN A: SELL LIMIT '+D.planEntry, 'color:#FF5252;font-weight:bold;font-size:12px;');
    el('SL <b>'+D.planSl+'</b> &nbsp; TP1 <b>'+D.planTp1+'</b> &nbsp; TP2 <b>'+D.planTp2+'</b>', 'font-size:11px;');
  }
  if(D.planBEntry && D.planBEntry !== '—'){
    el('PLAN B (WATCH): BUY LIMIT '+D.planBEntry+' 0.03', 'color:#64FF64;font-weight:bold;font-size:12px;');
    el('SL <b>'+D.planBSl+'</b> &nbsp; TP1 <b>'+D.planBTp1+'</b> &nbsp; TP2 <b>'+D.planBTp2+'</b>', 'font-size:11px;');
  }
  if(D.macro && D.macro.length){
    el('MACRO (WIB):', 'color:#FF9800;font-weight:bold;font-size:11px;');
    D.macro.forEach(function(m){ el(' &bull; '+m.t+' — '+m.e, 'font-size:10px;color:#FFB74D;'); });
  }

  sep();

  // MT5 REAL-TIME (dari bridge snapshot - entrian aktif yang sebenarnya)
  const pnlColor = x => x >= 0 ? '#00E676' : '#FF5252';
  if(D.mt5Acct){
    el('MT5 ' + D.mt5Acct + ' | Equity', 'color:#4FC3F7;font-weight:bold;font-size:11px;');
    el('<b style="color:#FFD700;">' + Number(D.mt5Equity).toLocaleString('id-ID') + '</b> <span style="color:' + pnlColor(D.mt5Profit) + ';">(' + (D.mt5Profit>=0?'+':'') + Math.round(D.mt5Profit) + ')</span>', 'font-size:11px;text-align:right;');
  }
  if(D.mt5Positions.length){
    el('POSISI MT5 (' + D.mt5Positions.length + '):', 'color:#26A69A;font-weight:bold;font-size:11px;');
    D.mt5Positions.forEach(function(p){
      el(p.dir + ' ' + p.vol.toFixed(2) + ' @ <b>' + p.entry + '</b> #' + p.t,
        'font-size:10px;color:' + pnlColor(p.pnl) + ';');
      el('&nbsp;&nbsp;SL ' + p.sl + ' → TP ' + p.tp + ' | ' + (p.pnl>=0?'+':'') + p.pnl.toLocaleString('id-ID'), 'font-size:9px;color:#90A4AE;');
    });
  } else if(D.mt5Acct){
    el('POSISI MT5: — (kosong)', 'font-size:10px;color:#888;');
  }
  if(D.mt5Orders.length){
    el('PENDING MT5 (' + D.mt5Orders.length + '):', 'color:#FFB74D;font-weight:bold;font-size:11px;');
    D.mt5Orders.forEach(function(o){
      el(o.dir + ' ' + o.vol.toFixed(2) + ' @ <b>' + o.entry + '</b> SL ' + o.sl + ' TP ' + o.tp + ' #' + o.t, 'font-size:10px;color:#FFE082;');
    });
  }

  // WATCHLIST / NO-ENTRY STATUS
  if(D.watchStatus){
    sep();

    el('WATCH: '+D.watchStatus, 'color:#FFD700;font-weight:bold;font-size:11px;');
    if(D.watchTitle) el(D.watchTitle, 'font-size:10px;color:#fff;margin-top:2px;');
    if(D.watchSyarat) el(D.watchSyarat, 'font-size:10px;color:#FFB74D;margin-top:2px;');
  }

  document.body.appendChild(ov);

  function evLine(){
    var now = Date.now(), i, e;
    for(i=0;i<D.evList.length;i++){ e=D.evList[i]; if(e.block && Math.abs(now-e.ts) <= D.evWin*60000) return {txt:'JENDELA EVENT: '+e.t+' - ENTRY DIBLOKIR', col:'#FF5252'}; }
    for(i=0;i<D.evList.length;i++){ if(D.evList[i].ts >= now-60000){ e=D.evList[i]; break; } }
    if(!e || e.ts < now-60000) return {txt:'Tidak ada event terjadwal', col:'#888'};
    var dt=e.ts-now, d=Math.floor(dt/86400000), h=Math.floor(dt%86400000/3600000), m=Math.floor(dt%3600000/60000);
    var s = d>0 ? d+'h '+h+'j' : (h>0 ? h+'j '+m+'m' : m+'m');
    return {txt:'EVENT: '+e.t+' - '+s+' lagi', col: dt<=3600000 ? '#FFA500' : '#FFB74D'};
  }

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
    var ev=document.getElementById('smc_event');
    if(ev){ var L=evLine(); ev.textContent=L.txt; ev.style.color=L.col; }
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
