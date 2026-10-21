const fs = require('fs');

function readJson(p, d) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } }

function evaluate(plan, price, atr, nowMs) {
  const atrEff = Number(atr) > 0 ? Number(atr) : Number(plan.atr_default) || 9;
  const maxChase = Number(plan.max_chase_poin) > 0 ? Number(plan.max_chase_poin) : +(atrEff * 0.45).toFixed(1);
  const dir = (plan.dir || 'SELL').toUpperCase();
  const entry = Number(plan.entry);
  const sl = Number(plan.sl);
  if (!entry || !price) return { status: 'NO_DATA', dist: null, maxChase, atr: atrEff };

  if (plan.expire_at && nowMs > Date.parse(plan.expire_at)) {
    return { status: 'EXPIRED', dist: null, maxChase, atr: atrEff, msg: 'lewat expire_at ' + plan.expire_at };
  }

  const dist = dir === 'SELL' ? entry - price : price - entry;

  if (plan.mode === 'stop') {
    const d = dir === 'SELL' ? price - entry : entry - price;
    if (d <= 0) return { status: 'TERSENTUH', dist: d, maxChase, atr: atrEff, msg: 'stop sudah tersentuh - cek posisi' };
    if (d <= maxChase) return { status: 'SIAP', dist: d, maxChase, atr: atrEff, msg: 'hanya ' + d.toFixed(1) + ' poin ke trigger breakdown' };
    return { status: 'TUNGGU', dist: d, maxChase, atr: atrEff, msg: d.toFixed(1) + ' poin lagi ke trigger (' + (d / atrEff).toFixed(1) + ' ATR)' };
  }

  if (dir === 'SELL') {
    if (price > sl) return { status: 'INVALID', dist, maxChase, atr: atrEff, msg: 'harga di atas SL ' + sl };
  } else {
    if (price < sl) return { status: 'INVALID', dist, maxChase, atr: atrEff, msg: 'harga di bawah SL ' + sl };
  }

  if (Math.abs(dist) <= maxChase) return { status: 'DI_ZONA', dist, maxChase, atr: atrEff, msg: 'dalam ' + maxChase + ' poin dari entry - tunggu CHoCH' };
  if (dist > maxChase) return { status: 'TUNGGU', dist, maxChase, atr: atrEff, msg: dist.toFixed(1) + ' poin lagi ke zona (' + (dist / atrEff).toFixed(1) + ' ATR)' };
  return { status: 'TELAT', dist, maxChase, atr: atrEff, msg: 'harga sudah lewat ' + Math.abs(dist).toFixed(1) + ' poin dari entry - JANGAN chase, tunggu retest baru' };
}

function fromFile(file) {
  const ov = readJson(file || 'C:/HEBAT/overlay_plan.json', {});
  const snap = readJson('C:/HEBAT/runtime/mt5_snapshot.json', {});
  const price = snap && snap.tick ? (snap.tick.bid + snap.tick.ask) / 2 : Number(ov.current_price) || 0;
  const atr = Number((ov.timing || {}).atr) || 0;
  const plans = Array.isArray(ov.layers) && ov.layers.length ? ov.layers : (ov.plan_a_sell ? [Object.assign({ dir: 'SELL' }, ov.plan_a_sell)] : []);
  return plans.map((p) => Object.assign({ name: p.name || 'PLAN' }, p, { eval: evaluate(Object.assign({}, ov.timing, p), price, atr, Date.now()) }));
}

module.exports = { evaluate, fromFile };

if (require.main === module) {
  const rows = fromFile(process.argv[2]);
  if (!rows.length) { console.log('tidak ada plan di overlay_plan.json'); process.exit(0); }
  for (const r of rows) {
    console.log(`${r.name} ${r.dir} @${r.entry} -> [${r.eval.status}] ${r.eval.msg || ''} | maxChase ${r.eval.maxChase} poin | ATR ${r.eval.atr}`);
  }
}
