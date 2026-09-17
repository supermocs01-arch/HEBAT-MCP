// jadwal_scan_ppp.cjs - Scan otomatis terjadwal menjelang PPI 19:30 WIB
// Dibuat 10 Sep 2026. Pakai: node jadwal_scan_ppp.cjs [interval_menit]  (default 5 menit)
// Mulai otomatis jam 19:20, loop sampai 20:45. Log -> C:/HEBAT/jadwal_scan_ppp.log
// v2: + REANALISIS FULL jam 19:40 (maks 1x) -> C:/HEBAT/reanalisis_ppp.log
const { execSync } = require('child_process');
const fs = require('fs');

const LOG = 'C:/HEBAT/jadwal_scan_ppp.log';
const RLOG = 'C:/HEBAT/reanalisis_ppp.log';
const CLI = 'C:/HEBAT/tradingview-mcp/src/cli/index.js';
const XAU = 'OANDA:XAUUSD';
const USD = 'THINKMARKETS:USDINDEX';

// ===== Konfigurasi jadwal (WIB) =====
const START_H = 19, START_M = 20;
const END_H = 20, END_M = 45;
const REANA_H = 19, REANA_M = 40;   // re-analisis full saat 19:40
const INTERVAL_MS = (process.argv[2] && !isNaN(process.argv[2])
  ? parseFloat(process.argv[2]) * 60000
  : 5 * 60000); // default 5 menit

let reanaDone = false;

function sLog(msg) {
  const n = new Date();
  const line = '[' + n.toTimeString().slice(0, 8) + ' WIB ' + n.toISOString().slice(0, 10) + '] ' + msg;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n'); } catch (e) {}
}
function sRandLog(msg) {
  const n = new Date();
  const line = '[' + n.toTimeString().slice(0, 8) + ' WIB ' + n.toISOString().slice(0, 10) + '] ' + msg;
  try { fs.appendFileSync(RLOG, line + '\n'); } catch (e) {}
}

function quote(sym) {
  try {
    const r = execSync('node "' + CLI + '" quote --symbol ' + sym, { encoding: 'utf8', timeout: 12000, stdio: ['pipe', 'pipe', 'pipe'] });
    const j = JSON.parse(r);
    return (j && typeof j.last === 'number') ? j.last : null;
  } catch (e) { return null; }
}

function readPine() {
  try {
    const r = execSync('node C:/HEBAT/baca_pine.cjs', { encoding: 'utf8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] });
    const i = r.indexOf('PINE_DATA_JSON|');
    if (i < 0) return null;
    return JSON.parse(r.slice(i + 'PINE_DATA_JSON|'.length).trim());
  } catch (e) { return null; }
}

function nowMin() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}
function hhmm() {
  const n = new Date();
  const h = n.getHours(), m = n.getMinutes();
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

// ===== REANALISIS FULL 19:40 (laporan terstruktur ke reanalisis_ppp.log) =====
function reanalysis() {
  if (reanaDone) return;
  reanaDone = true;
  sRandLog('================ REANALISIS PPI ' + hhmm() + ' WIB ================');
  sRandLog('(atutomatis dari jadwal_scan_ppp.cjs v2 - 10 Sep 2026)');

  const xau = quote(XAU);
  const usd = quote(USD);
  let pine = null;
  try { pine = readPine(); } catch (e) {}
  if (!pine || xau === null) { sRandLog('WARN data tidak lengkap - skip'); return; }

  const sig = String(pine.sig || 'FLAT'), ready = pine.ready || 0, rsi = pine.rsi || 0;
  const mtf = String(pine.mtf || '?'), zona = String(pine.zona || '?');
  const mid = pine.mid || 4388.2;
  const usdTxt = usd === null ? 'n/a' : usd.toFixed(2);

  sRandLog('XAU=' + xau.toFixed(2) + ' | DXY=' + usdTxt + ' | PINE=' + sig + ' ready=' + ready + ' | RSI=' + rsi + ' | zona=' + zona + ' | mid=' + mid + ' | MTF=' + mtf);

  const demLow = 4375, obBearLo = 4388.4, obBearHi = 4393.2;
  sRandLog('Level: demand 4375-4385 | OB bearish 4388.4-4393.2 | BUY LIMIT 4353 (SL 4345) | low recovery 4375');
  if (xau > obBearHi && sig === 'BUY') {
    sRandLog('>> VERDICT: BREAKOUT BULL VALID - close >4393 + PINE BUY. Entry zona 4385-4395, SL <4390, TP1 4410, TP2 4430. AKSI: BUY KONFIRM.');
  } else if (xau >= demLow && xau <= obBearHi && sig === 'BUY') {
    sRandLog('>> VERDICT: BUY KANDIDAT - harga di demand (4375-4385) + PINE BUY. SL <4375, TP1 4397, TP2 4410. AKSI: BUY KONFIRM.');
  } else if (xau <= demLow && sig === 'SELL') {
    sRandLog('>> VERDICT: SELL VALID - breakdown 4375 + PINE SELL. SL >4393 (retest), target 4353/zona bawah. AKSI: SELL (bawah mid).');
  } else if (xau <= demLow) {
    sRandLog('>> VERDICT: BREAK 4375 tanpa sinyal - sweep likuiditas. Tunggu CHoCH/PINE. BUY LIMIT 4353 berpeluang kena kalau konfirmasi. AKSI: TUNGGU.');
  } else if (xau >= obBearLo && sig === 'BUY') {
    sRandLog('>> VERDICT: TOWARD OB atas 4388-4393 + PINE BUY - butuh close >4393 utk valid. AKSI: TUNGGU close bar.');
  } else {
    sRandLog('>> VERDICT: NO SETUP - harga ' + xau.toFixed(2) + ' di antara zona, PINE ' + sig + ' belum flip. AKSI: TUNGGU katalis/konfirmasi.');
  }
  sRandLog('================ END REANALISIS ================');
}

function check() {
  const n = new Date();
  const hh = n.getHours(), mm = n.getMinutes();
  sLog('------- CYCLE ' + hhmm() + ' -------');

  if (nowMin() >= REANA_H * 60 + REANA_M) reanalysis();

  const xau = quote(XAU);
  const usd = quote(USD);
  let pine = null;
  try { pine = readPine(); } catch (e) {}

  if (xau === null || !pine) {
    sLog('WARN: data tidak lengkap xau=' + (xau !== null ? xau.toFixed(2) : 'null') + ' pine=' + !!pine);
    return;
  }

  const sig = String(pine.sig || 'FLAT');
  const ready = pine.ready || 0;
  const rsi = pine.rsi || 0;
  const mtf = pine.mtf || '?';
  const zona = pine.zona || '?';
  const usdTxt = usd === null ? 'n/a' : usd.toFixed(2);

  sLog('XAU=' + xau.toFixed(2) + ' | DXY=' + usdTxt + ' | PINE=' + sig + ' ready=' + ready + ' | RSI=' + rsi + ' | zona=' + zona + ' | MTF=' + mtf);

  const demLow = 4375;
  const demHi  = 4385;
  const obBearLo = 4388.4, obBearHi = 4393.2;
  const buyLimit = 4353, buyLimitSL = 4345;

  if (xau > obBearHi && sig === 'BUY') {
    sLog('>>> BREAKOUT BULL VALID: close di atas 4393 + PINE BUY -> target 4410 / 4430. SL di bawah 4393.');
  } else if (xau >= demLow && xau <= demHi && sig === 'BUY') {
    sLog('>>> ZONA DEMAND 4375-4385 + PINE BUY -> KANDIDAT BELI (konfirmasi penuh). SL <4375, TP1 4397, TP2 4410.');
  } else if (xau <= demLow && sig === 'SELL') {
    sLog('>>> BREAKDOWN 4375 + PINE SELL -> VALID SELL lanjut ke 4353 / zona bawah. SL > 4393 (retest).');
  } else if (xau <= demLow) {
    sLog('>> BREAK 4375 (sweep likuiditas): tunggu CHoCH/PINE; BUY LIMIT 4353 berpeluang kena apabila ada konfirmasi.');
  } else if (xau >= obBearLo && sig === 'BUY') {
    sLog('>>> MENDORONG KE UPPER OB (4388-4393): tunggu close > 4393 utk konfirmasi breakout buy.');
  } else {
    sLog('>> NO SETUP belum keluar - harga di antara zona (4381-4389), PINE belum flip; TUNGGU katalis.');
  }

  const passedPPI = (hh > 19 || (hh === 19 && mm >= 30));
  if (passedPPI) {
    sLog('(PPI SD RILIS 19:30) - periksa reaksi.');
  }
}

function runLoop() {
  check();
  const t = setInterval(() => {
    if (nowMin() >= END_H * 60 + END_M) {
      sLog('=== SESI SCAN SELESAI (lewat ' + END_H + ':' + END_M + ' WIB). Keluar. ===');
      clearInterval(t);
      process.exit(0);
    }
    check();
  }, INTERVAL_MS);
}

function start() {
  const target = START_H * 60 + START_M;
  const now = nowMin();
  let ms = (target - now) * 60000;
  if (ms < 0) ms = 0;
  sLog('Jadwal scan PPI siap (v2). Mulai ' + START_H + ':' + (START_M < 10 ? '0' : '') + START_M + ' WIB, interval ' + Math.round(INTERVAL_MS / 60000) + ' mnt, stop ' + END_H + ':' + END_M + ' WIB. REANALISIS ' + REANA_H + ':' + (REANA_M < 10 ? '0' : '') + REANA_M + ' WIB.');
  setTimeout(runLoop, ms);
}

start();