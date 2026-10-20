const fs = require('fs');

const SNAP = 'C:/HEBAT/runtime/mt5_snapshot.json';
const RC = 'C:/HEBAT/risk_calculator.json';
const OUT = 'C:/HEBAT/runtime/risk_live.json';

const readJson = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };

const snap = readJson(SNAP, {});
const rc = readJson(RC, {});
const kurs = Number((rc.account || {}).asumsi_kurs_usdidr) || 16000;
const oz = Number((rc.lot_calculation || {}).contract_size_oz) || 100;
const pct = (Number((rc.risk_management || {}).max_risk_per_trade_percent) || 2) / 100;
const minLot = Number((rc.lot_calculation || {}).min_lot) || 0.01;

const fresh = !!(snap && snap.ok && snap.account && (Date.now() / 1000 - (Number(snap.ts) || 0) <= 180));
if (!fresh) {
  console.log('MT5 snapshot TIDAK TERSEDIA / STALE -> tidak bisa hitung risk live.');
  console.log('Jalankan: python C:\\HEBAT\\services\\mt5_bridge.py --once');
  process.exit(1);
}

const a = snap.account;
const ccy = a.currency || 'USD';
const toUsd = (v) => (ccy === 'IDR' ? v / kurs : v);
const equityUsd = toUsd(Number(a.equity) || 0);
const balanceUsd = toUsd(Number(a.balance) || 0);
const riskUsd = equityUsd * pct;
const riskAcc = (Number(a.equity) || 0) * pct;

const rows = [5, 10, 15, 20, 30, 40, 60, 135].map((sl) => {
  const maxLotRaw = riskUsd / (sl * oz);
  const maxLot = Math.floor(maxLotRaw / minLot) * minLot;
  const lotAt = maxLot >= minLot ? maxLot : minLot;
  const riskAtMin = minLot * oz * sl;
  const ok = maxLot >= minLot;
  return {
    sl_poin: sl,
    max_lot_2pct: +maxLot.toFixed(2),
    lot_dipakai: +lotAt.toFixed(2),
    risk_usd: +(lotAt * oz * sl).toFixed(2),
    risk_idr: +((lotAt * oz * sl) * kurs).toFixed(0),
    risk_percent: +((lotAt * oz * sl) / equityUsd * 100).toFixed(1),
    status: ok ? 'OK' : 'DILARANG (min lot sudah > 2%)',
  };
});

const fmt = (n) => n.toLocaleString('id-ID');
console.log('=== RISK LIVE (dari MT5) ===');
console.log(`akun     : ${a.login} | ${a.server} | ${ccy} | leverage 1:${a.leverage}`);
console.log(`equity   : ${ccy} ${fmt(+Number(a.equity).toFixed(0))} (~$${equityUsd.toFixed(2)})`);
console.log(`balance  : ${ccy} ${fmt(+Number(a.balance).toFixed(0))}`);
console.log(`risk 2%  : ${ccy} ${fmt(+riskAcc.toFixed(0))} = $${riskUsd.toFixed(2)}`);
console.log(`kurs     : Rp${fmt(kurs)}/USD | kontrak ${oz} oz | min lot ${minLot}`);
console.log('');
console.log('SL(poin) | max lot 2% | lot dipakai | risk $ | risk Rp | risk % | status');
for (const r of rows) {
  console.log(
    String(r.sl_poin).padStart(7) + ' |' +
    String(r.max_lot_2pct).padStart(10) + ' |' +
    String(r.lot_dipakai).padStart(11) + ' |' +
    String(r.risk_usd).padStart(7) + ' |' +
    String(fmt(r.risk_idr)).padStart(9) + ' |' +
    String(r.risk_percent).padStart(6) + ' | ' + r.status
  );
}

const pos = (snap.positions || []).map((p) => {
  const dist = Math.abs((Number(p.price_open) || 0) - (Number(p.sl) || 0));
  return {
    ticket: p.ticket, symbol: p.symbol, type: p.type, volume: p.volume,
    price_open: p.price_open, sl: p.sl, tp: p.tp, profit: p.profit,
    sl_poin: +dist.toFixed(2),
    risk_usd: +(Number(p.volume) * oz * dist).toFixed(2),
    catatan: Number(p.sl) ? 'SL terpasang' : 'TANPA SL',
  };
});

if (pos.length) {
  console.log('');
  console.log('=== POSISI TERBUKA ===');
  for (const p of pos) {
    console.log(`${p.symbol} ${p.type} ${p.volume} @ ${p.price_open} SL=${p.sl || '-'} TP=${p.tp || '-'} | risk $${p.risk_usd} (${p.sl_poin} poin) | ${p.catatan} | float ${p.profit}`);
  }
} else {
  console.log('\nTidak ada posisi terbuka di MT5.');
}

const eq = equityUsd.toFixed(2);
console.log('');
console.log(`CATATAN: 0.01 lot = ${oz * 0.01} oz = $${(oz * 0.01).toFixed(2)} per 1.00 poin harga.`);
console.log(`Dengan equity $${eq}, 1 SL 30 poin di lot minimum = $${(minLot * oz * 30).toFixed(2)} (${((minLot * oz * 30) / equityUsd * 100).toFixed(1)}% equity).`);

fs.writeFileSync(OUT, JSON.stringify({
  at: new Date().toISOString(),
  account: { login: a.login, server: a.server, currency: ccy, equity: a.equity, balance: a.balance, leverage: a.leverage },
  kurs_usdidr: kurs, contract_oz: oz, min_lot: minLot,
  risk_percent: pct * 100, risk_usd: +riskUsd.toFixed(2), risk_acc: +riskAcc.toFixed(2),
  table: rows, positions: pos,
}, null, 2) + '\n');
console.log('disimpan:', OUT);
