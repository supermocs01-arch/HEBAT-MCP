const http = require('http');
const fs = require('fs');
const { execFile } = require('child_process');
const chartLock = require('./chart_lock.cjs');
const eventGuard = require('./event_guard.cjs');

const LOG = 'C:/HEBAT/monitor_limit_xau.log';
let lastClose = null;
const planState = {};
const STATE_FILE = 'C:/HEBAT/monitor_plan_state.json';
try { Object.assign(planState, JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))); } catch (e) {}
function savePlanState() { try { fs.writeFileSync(STATE_FILE, JSON.stringify(planState, null, 2)); } catch (e) {} }

function log(msg) {
  const n = new Date();
  const line = '[' + n.toTimeString().slice(0, 8) + ' WIB ' + n.toISOString().slice(0, 10) + '] ' + msg;
  console.log(line);
  fs.appendFileSync(LOG, line + '\n');
}

function readJson(f, def) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return def; } }

let riskWarnKey = null;
let stopWarnDate = null;
let blockEventId = null;
const timingState = {};

// OVERLAY AUTO-REFRESH (22 Okt): MT5 berubah -> inject ulang overlay (maks 1x/menit)
let mt5Sig = null;
let mt5InjectAt = 0;
function overlayAutoRefresh() {
  try {
    const snap = readJson('C:/HEBAT/runtime/mt5_snapshot.json', {});
    const posSig = (snap.positions || []).map(p => [p.ticket, p.sl, p.tp].join(':')).join('|');
    const ordSig = (snap.orders || []).map(o => [o.ticket, o.sl, o.tp].join(':')).join('|');
    const sig = posSig + '#' + ordSig;
    if (sig !== mt5Sig && Date.now() - mt5InjectAt > 60000) {
      const changed = mt5Sig !== null;
      mt5Sig = sig;
      mt5InjectAt = Date.now();
      if (changed) {
        log('[OVERLAY] MT5 berubah -> refresh overlay');
        execFile('node', ['C:/HEBAT/overlay_position.cjs'], () => {});
      }
    }
  } catch (e) {}
}

// ===== RISK GUARD (20 Okt): lot x 100 oz x SL poin harus <= 2% equity =====
// Equity diambil dari snapshot MT5 (runtime/mt5_snapshot.json) kalau masih fresh.
function riskReport() {
  const rc = readJson('C:/HEBAT/risk_calculator.json', {});
  const oz = Number((rc.lot_calculation || {}).contract_size_oz) || 100;
  const kurs = Number((rc.account || {}).asumsi_kurs_usdidr) || 16000;
  const riskPct = (Number((rc.risk_management || {}).max_risk_per_trade_percent) || 2) / 100;

  const snap = readJson('C:/HEBAT/runtime/mt5_snapshot.json', {});
  const a = snap && snap.account;
  const cfgMt5 = readJson('C:/HEBAT/config.json', {}).mt5 || {};
  const demoLogin = Number((cfgMt5.demoAccount || {}).login) || 0;
  const pos0 = readJson('C:/HEBAT/posisi.json', {});
  const posLogin = Number(pos0.mt5_login) || 0;
  const demoMismatch = !!(a && demoLogin && a.login === demoLogin && posLogin !== demoLogin);
  const fresh = !!(snap && snap.ok && a && !demoMismatch && (Date.now() / 1000 - (Number(snap.ts) || 0) <= 180));
  let modalUsd = Number((rc.account || {}).modal_usd_estimate) || 1500;
  let src = demoMismatch ? 'config (akun MT5 ' + a.login + ' = DEMO, posisi ini REAL)' : 'config';
  if (fresh) {
    modalUsd = a.currency === 'IDR' ? (Number(a.equity) || 0) / kurs : (Number(a.equity) || 0);
    src = 'MT5 ' + a.login + ' ' + a.currency;
  }
  const maxUsd = +(modalUsd * riskPct).toFixed(2);

  const pos = pos0;
  const lots = Array.isArray(pos.layers) && pos.layers.length
    ? pos.layers.reduce((s, l) => s + (Number(l.lot) || 0), 0)
    : (Number(pos.lot) || (pos.active ? 0.01 : 0));
  const entry = Number(pos.entry) || 0, sl = Number(pos.sl) || 0;
  if (!pos.active || !lots || !entry || !sl) return null;
  const pips = Math.abs(entry - sl);
  const usd = +(lots * oz * pips).toFixed(2);
  const pct = +(usd / modalUsd * 100).toFixed(1);
  const key = lots + '@' + pips + '@' + src;
  if (key !== riskWarnKey) {
    riskWarnKey = key;
    log('RISK CHECK [' + src + ', equity $' + modalUsd.toFixed(2) + ']: ' + lots.toFixed(2) + ' lot x ' + pips.toFixed(1) + ' poin = $' + usd + ' (' + pct + '% equity) | batas 2% $' + maxUsd +
      (usd > maxUsd ? ' -> LEWAT BATAS ' + (usd / maxUsd).toFixed(1) + 'x' : ''));
  }
  return { usd, pct, maxUsd, lots, pips, src, modalUsd };
}

function stopDayCheck() {
  const e = readJson('C:/HEBAT/entry_hari.json', {});
  const today = new Date().toISOString().slice(0, 10);
  if (e.tanggal === today && Number(e.loss_count) >= 2 && stopWarnDate !== today) {
    stopWarnDate = today;
    log('STOP HARIAN: loss_count=' + e.loss_count + '/2 - JANGAN entry lagi hari ini (aturan paten)');
  }
}

// Sumber plan: overlay_plan.json (limit pending) + posisi.json (posisi aktif) - bukan entry.json stale
function loadPlans() {
  const plans = [];
  try {
    const ov = JSON.parse(fs.readFileSync('C:/HEBAT/overlay_plan.json', 'utf8'));
    if (ov.active && ov.plan_a_sell && !(Array.isArray(ov.layers) && ov.layers.length)) plans.push({
      id: 'A', name: 'SELL LIMIT', dir: 'SELL',
      entry: parseFloat(ov.plan_a_sell.entry), sl: parseFloat(ov.plan_a_sell.sl),
      tp1: parseFloat(ov.plan_a_sell.tp1), tp2: parseFloat(ov.plan_a_sell.tp2),
      state: 'waiting'
    });
    if (ov.active && ov.plan_b_buy) plans.push({
      id: 'B', name: 'BUY LIMIT', dir: 'BUY',
      entry: parseFloat(ov.plan_b_buy.entry), sl: parseFloat(ov.plan_b_buy.sl),
      tp1: parseFloat(ov.plan_b_buy.tp1), tp2: parseFloat(ov.plan_b_buy.tp2),
      state: 'waiting'
    });
    if (ov.active && Array.isArray(ov.layers)) {
      ov.layers.forEach((L, i) => {
        plans.push({
          id: 'LY' + (i + 1), name: (L.name || 'SELL LIMIT') + (L.ticket ? ' #' + L.ticket : ''), dir: L.dir || 'SELL', mode: L.mode || (ov.timing && ov.timing.mode) || 'limit',
          entry: parseFloat(L.entry), sl: parseFloat(L.sl),
          tp1: parseFloat(L.tp1), tp2: parseFloat(L.tp2),
          state: 'waiting'
        });
      });
    }
  } catch (e) { log('WARN overlay_plan.json tidak terbaca: ' + e.message); }
  try {
    const p = JSON.parse(fs.readFileSync('C:/HEBAT/posisi.json', 'utf8'));
    if (p.active) {
      const dir = /SELL/i.test(p.title || '') ? 'SELL' : 'BUY';
      plans.unshift({
        id: 'LIVE', name: 'POSISI AKTIF', dir,
        entry: parseFloat(p.entry), sl: parseFloat(p.sl),
        tp1: parseFloat(p.tp1), tp2: parseFloat(p.tp2),
        state: 'filled'
      });
    }
  } catch (e) {}
  return plans;
}

function cdp() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/') && !x.url.includes('doubleclick') && !x.url.includes('google'));
        if (!t) return reject(new Error('no chart'));
        const ws = new (require('ws'))(t.webSocketDebuggerUrl);
        let id = 1;
        const send = (m, p) => new Promise(r => { const mid = id++; const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); r(j.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); });
        ws.on('open', () => resolve({ ws, send }));
      });
    }).on('error', reject);
  });
}

function pineStudyId() {
  try {
    const cfg = JSON.parse(fs.readFileSync('C:/HEBAT/config.json', 'utf8'));
    if (cfg.pineStudyId) return cfg.pineStudyId;
  } catch (e) {}
  return 'PTdIuB';
}

async function check() {
  const { ws, send } = await cdp();
  await send('Runtime.enable');
  try {
    const SID = pineStudyId();
    const r = await send('Runtime.evaluate', { expression: `(function(){
      var wv=window.TradingViewApi._activeChartWidgetWV.value();
      var pw=wv._chartWidget._paneWidgets._value[0];
      var bars=pw._state.m_dataSources[0]._seriesSource._data.m_bars._items;
      var last=bars[bars.length-1].value;
      var st=null;
      try{var s=wv.getStudyById('${SID}');var src=s._study||s;var g=src._graphics||(src._source&&src._source._graphics);var pc=g._primitivesCollection;var col=pc.dwglabels.get('labels').get(false)._primitivesDataById;col.forEach(function(l){if(l.t&&l.t.indexOf('PINE_DATA|')===0)st=l.t});}catch(e){}
      if(!st){try{var s2=wv.getStudyById('PTdIuB');var src2=s2._study||s2;var g2=src2._graphics||(src2._source&&src2._source._graphics);var pc2=g2._primitivesCollection;var col2=pc2.dwglabels.get('labels').get(false)._primitivesDataById;col2.forEach(function(l){if(l.t&&l.t.indexOf('PINE_DATA|')===0)st=l.t});}catch(e){}}
      return JSON.stringify({h:last[2],l:last[3],c:last[4],pine:st,t0:last[0],t1:bars.length>1?bars[bars.length-2].value[0]:0});
    })()`, returnByValue: true });
    const v = JSON.parse(r.result.value);

    // ===== GUARD TF (28 Aug: bar Weekly bikin alarm TP/SL palsu) =====
    const interval = v.t1 ? (v.t0 - v.t1) : 0;
    if (!interval || interval > 900) {
      // CHART LOCK (2 Okt): jangan rebut chart saat skrip lain sedang cycle TF /
      // switch symbol (analisa_gabungan, usdxau_correlation, warmup_pine).
      const holder = chartLock.heldBy();
      if (holder) {
        log('GUARD TF: chart dikunci ' + holder.owner + ' - auto-set M15 ditunda, siklus ini dilewati');
        return;
      }
      if (!(await chartLock.acquire('monitor_guard_tf', { waitMs: 0, pollMs: 250 }))) {
        log('GUARD TF: baru saja dikunci skrip lain - auto-set M15 dilewati');
        return;
      }
      log('GUARD TF: chart tidak di M15 (interval bar ' + Math.round(interval / 60) + ' mnt) - auto-set M15, siklus ini dilewati');
      await send('Runtime.evaluate', { expression: `window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.setResolution('15')` });
      await new Promise(r => setTimeout(r, 3000));
      chartLock.release();
      return;
    }

    // ===== FILTER GLITCH (pelajaran tick 159.32 - 25 Aug) =====
    if (!v.c || v.c < 1000 || v.l < 1000 || v.h > 20000) {
      log('GLITCH DITOLAK: c=' + v.c + ' l=' + v.l + ' h=' + v.h + ' - data tidak masuk akal, siklus dilewati');
      return;
    }
    if (lastClose !== null && Math.abs(v.c - lastClose) > 120) {
      log('GLITCH DITOLAK: lompatan ' + Math.abs(v.c - lastClose).toFixed(1) + ' pips dalam 1 menit (c=' + v.c.toFixed(2) + ', sebelumnya=' + lastClose.toFixed(2) + ')');
      return;
    }
    if (v.h - v.c > 120 || v.c - v.l > 120) {
      log('GLITCH DITOLAK: wick mustahil (h=' + v.h + ' l=' + v.l + ' c=' + v.c.toFixed(2) + ') - bar tidak masuk akal utk intraday');
      return;
    }
    lastClose = v.c;

    const pine = v.pine ? v.pine.split('|') : null;
    const sig = pine ? pine[3] : '?';
    const rsi = pine ? pine[2] : '?';
    const atrM15 = pine && Number(pine[5]) > 0 ? Number(pine[5]) : 0;
    const timing = require('./entry_timing.cjs');
    const timingOv = (() => { try { return JSON.parse(fs.readFileSync('C:/HEBAT/overlay_plan.json', 'utf8')); } catch (e) { return {}; } })();

    // ===== EVENT GUARD (20 Okt): blokir limit pending +/- 30 mnt dari event high-impact =====
    const evActive = eventGuard.activeWindow();
    if (evActive) {
      if (blockEventId !== evActive.id) {
        blockEventId = evActive.id;
        log('EVENT WINDOW: ' + evActive.title + ' (+/-' + eventGuard.load().windowMinutes + ' mnt) - limit pending TIDAK diproses');
      }
    } else if (blockEventId) {
      log('EVENT WINDOW selesai - limit pending diproses lagi');
      blockEventId = null;
    }
    stopDayCheck();
    riskReport();

    for (const p of loadPlans()) {
      const skey = p.id + '@' + p.entry;
      if (planState[skey]) p.state = planState[skey];
      if (p.state === 'waiting' && !evActive) {
        const ev = timing.evaluate(Object.assign({}, timingOv.timing, { dir: p.dir, entry: p.entry, sl: p.sl }), v.c, atrM15, Date.now());
        const tkey = p.id + '|' + ev.status;
        if (timingState[p.id] !== tkey) {
          timingState[p.id] = tkey;
          log('[TIMING ' + p.id + '] ' + ev.status + ' - ' + (ev.msg || '') + ' | maxChase ' + ev.maxChase + ' poin | ATR ' + ev.atr);
          if (ev.status === 'INVALID' || ev.status === 'EXPIRED') log('[TIMING ' + p.id + '] >>> BATALKAN plan (jangan dipasang/dibiarkan)');
        }
        if (ev.status === 'DI_ZONA') {
          const searah = (p.dir === 'BUY' && sig === 'BUY') || (p.dir === 'SELL' && sig === 'SELL');
          const ck = p.id + '|' + (searah ? 'OK' : 'NO');
          if (timingState['konf_' + p.id] !== ck) {
            timingState['konf_' + p.id] = ck;
            log('[KONFIRMASI ' + p.id + '] ' + (searah ? 'PINE ' + sig + ' SEARAH - boleh jalan' : 'PINE=' + sig + ' BELUM SEARAH - JANGAN biarkan fill tanpa CHoCH (MISS #12)'));
          }
        }
        const isStop = p.mode === 'stop';
        const touched = isStop
          ? (p.dir === 'BUY' ? (v.h >= p.entry) : (v.l <= p.entry))
          : (p.dir === 'BUY' ? (v.l <= p.entry) : (v.h >= p.entry));
        if (touched) {
          p.state = 'filled';
          planState[skey] = 'filled';
          savePlanState();
          log('>>> ' + p.name + ' ' + p.id + ' KENA @' + p.entry + ' | harga=' + v.c.toFixed(2) + ' | PINE=' + sig + ' RSI=' + rsi);
          if ((p.dir === 'BUY' && sig !== 'BUY') || (p.dir === 'SELL' && sig !== 'SELL')) {
            log('>>> PERINGATAN MISS #12: PINE belum konfirmasi ' + p.dir + ' - posisi AGRESIF, siap cut cepat!');
          }
          log('=== TRACKING ' + p.id + ': SL ' + p.sl + ' | TP1 ' + p.tp1 + ' (L1 close) | TP2 ' + p.tp2 + ' (L2 runner) ===');
        } else {
          log('[' + p.id + '] ' + p.name + ' ' + p.entry + ' belum kena | harga=' + v.c.toFixed(2) + ' | PINE=' + sig + ' RSI=' + rsi);
        }
      }
      if (p.state === 'filled' || p.state === 'tp1_done') {
        const floatPips = ((v.c - p.entry) * (p.dir === 'BUY' ? 1 : -1)).toFixed(1);
        let events = [];
        if (p.dir === 'BUY') {
          if (v.l <= p.sl) events.push('*** SL KENA *** harga=' + v.c.toFixed(2) + ' - CUT DISIPLIN, catat hasil');
          else if (v.h >= p.tp2) events.push('*** TP2 KENA *** harga=' + v.c.toFixed(2) + ' - L2 full profit!');
          else if (p.state !== 'tp1_done' && v.h >= p.tp1) events.push('*** TP1 KENA *** harga=' + v.c.toFixed(2) + ' - L1 profit! Geser SL L2 ke BE ' + p.entry);
        } else {
          if (v.h >= p.sl) events.push('*** SL KENA *** harga=' + v.c.toFixed(2) + ' - CUT DISIPLIN, catat hasil');
          else if (v.l <= p.tp2) events.push('*** TP2 KENA *** harga=' + v.c.toFixed(2) + ' - L2 full profit!');
          else if (p.state !== 'tp1_done' && v.l <= p.tp1) events.push('*** TP1 KENA *** harga=' + v.c.toFixed(2) + ' - L1 profit! Geser SL L2 ke BE ' + p.entry);
        }
        if (events.length) {
          events.forEach(e => log(e));
          p.state = events[0].includes('TP1') ? 'tp1_done' : 'closed';
          planState[skey] = p.state;
          savePlanState();
        } else {
          log('[' + p.id + '] floating ' + floatPips + ' pips | harga=' + v.c.toFixed(2) + ' | PINE=' + sig + ' RSI=' + rsi);
        }
      }
    }
  } catch (e) {
    log('ERROR: ' + e.message);
  } finally {
    ws.close();
  }
}

(async () => {
  // ===== SELF-LOCK ATOMIK (28 Aug: race hi_fitra vs auto_start_watch bikin dobel) =====
  const LOCK = 'C:/HEBAT/monitor.lock';
  (function tryLock() {
    try {
      fs.writeFileSync(LOCK, String(process.pid), { flag: 'wx' }); // gagal jika file sudah ada = atomik
      return;
    } catch (e) {
      if (e.code !== 'EEXIST') { try { fs.writeFileSync(LOCK, String(process.pid)); } catch (_) {} return; }
      let pid = NaN;
      try { pid = parseInt(fs.readFileSync(LOCK, 'utf8')); } catch (_) {}
      let alive = false;
      if (pid && pid !== process.pid) {
        try { process.kill(pid, 0); alive = true; } catch (err) { alive = (err.code === 'EPERM'); }
      }
      if (alive) {
        log('START DITOLAK: monitor lain hidup (PID ' + pid + ') - anti-dobel');
        console.log('Monitor lain hidup (PID ' + pid + ') - exit');
        process.exit(0);
      }
      // lock stale -> ambil alih
      try { fs.unlinkSync(LOCK); } catch (_) {}
      try { fs.writeFileSync(LOCK, String(process.pid), { flag: 'wx' }); } catch (_) { try { fs.writeFileSync(LOCK, String(process.pid)); } catch (_) {} }
    }
  })();

  log('=== MONITOR XAU V2 MULAI (20 Okt: + risk guard + event guard + state persist) ===');
  try {
    const det = require('./pine_study.cjs').detect({ quiet: true });
    log('  pine_study: ' + (det.ok ? 'id ' + det.id + ' (' + det.name + ')' + (det.changed ? ' [DIPERBARUI dari ' + (det.previous || 'kosong') + ']' : '') : 'GAGAL - ' + det.reason));
  } catch (e) { log('  pine_study: error ' + e.message); }
  log('  ' + eventGuard.text());
  riskReport();
  const p0 = loadPlans();
  if (!p0.length) log('  Tidak ada plan aktif / posisi aktif saat ini');
  p0.forEach(p => log('  [' + p.id + '] ' + p.name + ' ' + p.dir + ' entry=' + p.entry + ' SL=' + p.sl + ' TP1=' + p.tp1 + ' TP2=' + p.tp2 + ' (' + p.state + ')'));
  await check();
  setInterval(() => { overlayAutoRefresh(); check(); }, 60000);
  setTimeout(() => process.exit(0), 24 * 60 * 60 * 1000);
})();
