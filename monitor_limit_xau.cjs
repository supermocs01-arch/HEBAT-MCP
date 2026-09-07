const http = require('http');
const fs = require('fs');

const LOG = 'C:/HEBAT/monitor_limit_xau.log';
let lastClose = null;
const planState = {};

function log(msg) {
  const n = new Date();
  const line = '[' + n.toTimeString().slice(0, 8) + ' WIB ' + n.toISOString().slice(0, 10) + '] ' + msg;
  console.log(line);
  fs.appendFileSync(LOG, line + '\n');
}

// Sumber plan: overlay_plan.json (limit pending) + posisi.json (posisi aktif) - bukan entry.json stale
function loadPlans() {
  const plans = [];
  try {
    const ov = JSON.parse(fs.readFileSync('C:/HEBAT/overlay_plan.json', 'utf8'));
    if (ov.active && ov.plan_a_sell) plans.push({
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
      try{var s=wv.getStudyById('${SID}');var src=s._study||s;var g=src._graphics||(src._source&&src._source._graphics);var pc=g._primitivesCollection;var col=pc.dwglabels.get('labels').get(false)._primitivesDataById;col.forEach(function(l){if(l.t&&l.t.indexOf('PINE_DATA')===0)st=l.t});}catch(e){}
      if(!st){try{var s2=wv.getStudyById('PTdIuB');var src2=s2._study||s2;var g2=src2._graphics||(src2._source&&src2._source._graphics);var pc2=g2._primitivesCollection;var col2=pc2.dwglabels.get('labels').get(false)._primitivesDataById;col2.forEach(function(l){if(l.t&&l.t.indexOf('PINE_DATA')===0)st=l.t});}catch(e){}}
      return JSON.stringify({h:last[2],l:last[3],c:last[4],pine:st,t0:last[0],t1:bars.length>1?bars[bars.length-2].value[0]:0});
    })()`, returnByValue: true });
    const v = JSON.parse(r.result.value);

    // ===== GUARD TF (28 Aug: bar Weekly bikin alarm TP/SL palsu) =====
    const interval = v.t1 ? (v.t0 - v.t1) : 0;
    if (!interval || interval > 900) {
      log('GUARD TF: chart tidak di M15 (interval bar ' + Math.round(interval / 60) + ' mnt) — auto-set M15, siklus ini dilewati');
      await send('Runtime.evaluate', { expression: `window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.setResolution('15')` });
      return;
    }

    // ===== FILTER GLITCH (pelajaran tick 159.32 - 25 Aug) =====
    if (!v.c || v.c < 1000 || v.l < 1000 || v.h > 20000) {
      log('GLITCH DITOLAK: c=' + v.c + ' l=' + v.l + ' h=' + v.h + ' — data tidak masuk akal, siklus dilewati');
      return;
    }
    if (lastClose !== null && Math.abs(v.c - lastClose) > 120) {
      log('GLITCH DITOLAK: lompatan ' + Math.abs(v.c - lastClose).toFixed(1) + ' pips dalam 1 menit (c=' + v.c.toFixed(2) + ', sebelumnya=' + lastClose.toFixed(2) + ')');
      return;
    }
    if (v.h - v.c > 120 || v.c - v.l > 120) {
      log('GLITCH DITOLAK: wick mustahil (h=' + v.h + ' l=' + v.l + ' c=' + v.c.toFixed(2) + ') — bar tidak masuk akal utk intraday');
      return;
    }
    lastClose = v.c;

    const pine = v.pine ? v.pine.split('|') : null;
    const sig = pine ? pine[3] : '?';
    const rsi = pine ? pine[2] : '?';

    for (const p of loadPlans()) {
      const skey = p.id + '@' + p.entry;
      if (planState[skey]) p.state = planState[skey];
      if (p.state === 'waiting') {
        const touched = p.dir === 'BUY' ? (v.l <= p.entry) : (v.h >= p.entry);
        if (touched) {
          p.state = 'filled';
          log('>>> ' + p.name + ' ' + p.id + ' KENA @' + p.entry + ' | harga=' + v.c.toFixed(2) + ' | PINE=' + sig + ' RSI=' + rsi);
          if ((p.dir === 'BUY' && sig !== 'BUY') || (p.dir === 'SELL' && sig !== 'SELL')) {
            log('>>> PERINGATAN MISS #12: PINE belum konfirmasi ' + p.dir + ' — posisi AGRESIF, siap cut cepat!');
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
          if (v.l <= p.sl) events.push('*** SL KENA *** harga=' + v.c.toFixed(2) + ' — CUT DISIPLIN, catat hasil');
          else if (v.h >= p.tp2) events.push('*** TP2 KENA *** harga=' + v.c.toFixed(2) + ' — L2 full profit!');
          else if (p.state !== 'tp1_done' && v.h >= p.tp1) events.push('*** TP1 KENA *** harga=' + v.c.toFixed(2) + ' — L1 profit! Geser SL L2 ke BE ' + p.entry);
        } else {
          if (v.h >= p.sl) events.push('*** SL KENA *** harga=' + v.c.toFixed(2) + ' — CUT DISIPLIN, catat hasil');
          else if (v.l <= p.tp2) events.push('*** TP2 KENA *** harga=' + v.c.toFixed(2) + ' — L2 full profit!');
          else if (p.state !== 'tp1_done' && v.l <= p.tp1) events.push('*** TP1 KENA *** harga=' + v.c.toFixed(2) + ' — L1 profit! Geser SL L2 ke BE ' + p.entry);
        }
        if (events.length) {
          events.forEach(e => log(e));
          p.state = events[0].includes('TP1') ? 'tp1_done' : 'closed';
          planState[p.id] = p.state;
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

  log('=== MONITOR XAU V2 MULAI (update 28 Aug: self-lock + guard TF + wick sanity + state persist) ===');
  const p0 = loadPlans();
  if (!p0.length) log('  Tidak ada plan aktif / posisi aktif saat ini');
  p0.forEach(p => log('  [' + p.id + '] ' + p.name + ' ' + p.dir + ' entry=' + p.entry + ' SL=' + p.sl + ' TP1=' + p.tp1 + ' TP2=' + p.tp2 + ' (' + p.state + ')'));
  await check();
  setInterval(check, 60000);
  setTimeout(() => process.exit(0), 24 * 60 * 60 * 1000);
})();
