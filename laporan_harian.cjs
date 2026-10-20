const fs = require('fs');
const path = require('path');

const H = __dirname;
const now = new Date();
const ymd = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
const jam = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

function readJson(f, def) {
  try { return JSON.parse(fs.readFileSync(path.join(H, f), 'utf8')); } catch (e) { return def || {}; }
}

const P = readJson('posisi.json');
const E = readJson('entry_hari.json');
const O = readJson('overlay_plan.json');
const R = readJson('risk_calculator.json');
const EG = require(path.join(H, 'event_guard.cjs'));

let logLines = [];
try { logLines = fs.readFileSync(path.join(H, 'monitor_limit_xau.log'), 'utf8').split(/\r?\n/).filter(Boolean); } catch (e) {}
const todayLines = logLines.filter(l => l.includes('[LIVE]') || l.includes('KENA') || l.includes('RISK CHECK'));
const tail = logLines.slice(-5);

let harga = '?', pine = '?';
for (let i = logLines.length - 1; i >= 0; i--) {
  const m = logLines[i].match(/harga=([\d.]+)/);
  const pm = logLines[i].match(/PINE=(\w+) RSI=([\d.]+)/);
  if (harga === '?' && m) harga = m[1];
  if (pine === '?' && pm) pine = pm[1] + ' (RSI ' + pm[2] + ')';
  if (harga !== '?' && pine !== '?') break;
}

const kena = todayLines.filter(l => /SL KENA|TP1 KENA|TP2 KENA|KENA @/.test(l));
const risk = (() => {
  const lots = Array.isArray(P.layers) && P.layers.length ? P.layers.reduce((s, l) => s + (Number(l.lot) || 0), 0) : (Number(P.lot) || 0);
  const pips = Math.abs((Number(P.entry) || 0) - (Number(P.sl) || 0));
  const oz = Number((R.lot_calculation || {}).contract_size_oz) || 100;
  const max = Number((R.risk_management || {}).max_risk_per_trade_usd) || 30;
  if (!lots || !pips) return 'tidak ada posisi / SL kosong';
  const usd = Math.round(lots * oz * pips);
  return lots.toFixed(2) + ' lot x ' + pips.toFixed(1) + ' poin = $' + usd + ' (batas $' + max + (usd > max ? ' -> LEWAT ' + (usd / max).toFixed(1) + 'x' : '') + ')';
})();

const evNext = EG.upcoming(4).map(e => '- ' + EG.jamWib(e.ts) + ' WIB — ' + e.title + (e.note ? ' (' + e.note + ')' : '')).join('\n') || '- (tidak ada)';

const md = [
  '# Laporan Harian — ' + ymd,
  '',
  'Dibuat: ' + ymd + ' ' + jam + ' WIB',
  '',
  '## Posisi',
  '- Status: ' + (P.active ? (P.title || 'aktif') : 'TIDAK ADA POSISI'),
  '- Entry / SL / TP: ' + (P.entry || '—') + ' / ' + (P.sl || '—') + ' / ' + (P.tp1 || '—'),
  '- Harga log terakhir: ' + harga,
  '- Floating: ' + (P.floating_pips != null ? P.floating_pips : '?') + ' poin',
  '- Risiko vs batas: ' + risk,
  '',
  '## Jatah & Disiplin',
  '- Entry: ' + (E.entry_ke != null ? E.entry_ke : '?') + '/3 | Loss: ' + (E.loss_count != null ? E.loss_count : '?') + '/2 | Sisa: ' + (E.sisa_jatah != null ? E.sisa_jatah : '?'),
  '- Tanggal data: ' + (E.tanggal || '?'),
  '',
  '## Sinyal / PINE',
  '- PINE M15: ' + pine,
  '- Status plan: ' + (O.active ? (O.title || 'aktif') : 'NO LIMIT AKTIF — ' + (O.status || '')),
  '',
  '## Event',
  '- Sekarang: ' + EG.text(),
  evNext,
  '',
  '## Event terdeteksi hari ini (monitor)',
  kena.length ? kena.map(l => '- ' + l).join('\n') : '- (tidak ada fill/SL/TP hari ini)',
  '',
  '## Log monitor (5 terakhir)',
  '```',
  tail.join('\n') || '(log kosong)',
  '```',
  ''
].join('\n');

const dir = path.join(H, 'laporan');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, ymd + '.md');
fs.writeFileSync(file, md);
console.log('[laporan] ' + file);
console.log(md.split('\n').slice(0, 12).join('\n'));
