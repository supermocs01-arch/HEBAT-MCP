// hitung.cjs - Kalkulator entry otomatis (spesifikasi akun $12 cent)
//   node hitung.cjs                  -> hitung plan aktif (overlay_plan.json / posisi.json)
//   node hitung.cjs <entry> [sl] [tp1] [tp2] [lot] -> hitung manual
//
// Spesifikasi akun (sama dgn catat.cjs):
//   Saldo $12 = 1,200 USC | Leverage 1:2000 | Lot dasar 0.01
//   USC_PER_POINT 100 per 1.0 harga @0.01 lot | Spread 0.30 pips (0.03 pt)
//   1 pip XAU = 0.1 pt | 10 pips = 1.0 pt

const fs = require('fs');
const path = require('path');

const TARGET = 12000;
const LOT_BASE = 0.01;
const USC_PER_POINT = 100;
const SPREAD_PIPS = 0.30;         // 0.3 pips = 0.03 pt
const SALDO_USC = 1200;

function fmt(n) { return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function fmtUsc(n) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function hitung(entry, sl, tp1, tp2, lot) {
  lot = lot || LOT_BASE;
  const perPt = USC_PER_POINT * (lot / LOT_BASE);
  const spreadCost = SPREAD_PIPS * 10 * (SPREAD_PIPS ? 0.1 : 0); // spread dalam pt
  const spreadPts = 0.03;
  const spreadUsc = spreadPts * perPt;

  const slDist = Math.abs(entry - sl);
  const slPips = (slDist * 10).toFixed(0);
  const riskUsc = slDist * perPt;

  const rows = [];
  rows.push('══════════════════════════════════');
  rows.push('  ENTRY   : ' + entry);
  rows.push('  LOT     : ' + lot);
  rows.push('  SL      : ' + sl + '  (' + slPips + ' pips)');
  rows.push('──────────────────────────────────');
  rows.push('  RISIKO  : -' + fmtUsc(riskUsc) + ' USC (-' + fmtUsc(riskUsc + spreadUsc) + ' USC + spread)');
  rows.push('  RISIKO  : ' + (riskUsc / SALDO_USC * 100).toFixed(1) + '% dari saldo ' + fmt(SALDO_USC) + ' USC');
  rows.push('──────────────────────────────────');
  if (tp1) {
    const d = Math.abs(tp1 - entry);
    const pips = (d * 10).toFixed(0);
    const win = d * perPt - spreadUsc;
    const rr = (d / slDist).toFixed(2);
    rows.push('  TP1     : ' + tp1 + '  (' + pips + ' pips)');
    rows.push('  PROFIT  : +' + fmtUsc(win) + ' USC (net) | RR ' + rr + 'R');
  }
  if (tp2) {
    const d = Math.abs(tp2 - entry);
    const pips = (d * 10).toFixed(0);
    const win = d * perPt - spreadUsc;
    const rr = (d / slDist).toFixed(2);
    rows.push('  TP2     : ' + tp2 + '  (' + pips + ' pips)');
    rows.push('  PROFIT  : +' + fmtUsc(win) + ' USC (net) | RR ' + rr + 'R');
  }
  if (tp1 && tp2) {
    rows.push('  TOTAL   : +' + fmtUsc((Math.abs(tp1-entry) + Math.abs(tp2-entry)) * perPt - 2 * spreadUsc) + ' USC (TP1+TP2)');
  }
  rows.push('──────────────────────────────────');
  rows.push('  MODAL   : ' + fmt(SALDO_USC) + ' USC  |  Sisa target: ' + fmt(TARGET - readProgress()) + ' USC');
  rows.push('  PATEN   : SL maks 20 pips | TP1 30-40+ (1:3) | TP2 40+ (1:4)');
  rows.push('══════════════════════════════════');
  return rows.join('\n');
}

function readProgress() { try { return parseFloat(fs.readFileSync(path.join(__dirname, 'progress.txt'), 'utf8')) || 0; } catch (e) { return 0; } }

const args = process.argv.slice(2);
if (args.length >= 2) {
  const entry = parseFloat(args[0]);
  const sl = parseFloat(args[1]);
  const tp1 = args[2] ? parseFloat(args[2]) : null;
  const tp2 = args[3] ? parseFloat(args[3]) : null;
  const lot = args[4] ? parseFloat(args[4]) : LOT_BASE;
  console.log(hitung(entry, sl, tp1, tp2, lot));
  process.exit(0);
}

// Mode otomatis: ambil plan aktif
function getPlan() {
  for (const f of ['posisi.json', 'overlay_plan.json']) {
    try {
      const p = JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));
      if (p && p.active) return p;
    } catch (e) {}
  }
  return null;
}

const plan = getPlan();
if (!plan) { console.log('Tidak ada plan aktif.'); process.exit(0); }

const m = String(plan.title).match(/(\d+\.\d+)/);
const entry = m ? parseFloat(m[1]) : null;
const sl = parseFloat(String(plan.sl).match(/(\d+\.\d+)/)?.[0]);
const tp1 = parseFloat(String(plan.tp1).match(/(\d+\.\d+)/)?.[0]);
const tp2 = parseFloat(String(plan.tp2).match(/(\d+\.\d+)/)?.[0]);

if (!entry || isNaN(sl)) { console.log('Plan aktif tidak punya entry/SL hitung-able.'); console.log('  ' + (plan.title || '') + ' | ' + (plan.status || '')); process.exit(0); }

console.log('PLAN: ' + plan.title);
console.log(hitung(entry, sl, tp1, tp2, LOT_BASE));
