const { exec } = require('child_process');
const { promisify } = require('util');
const execP = promisify(exec);
const lock = require('./chart_lock.cjs');

// FIX 30 Sep 2026:
// CLI tv TIDAK punya flag --symbol/--resolution untuk `ohlcv` (hanya membaca chart AKTIF).
// Versi lama selalu mengembalikan data XAUUSD utk semua query DXY -> verdict BOGUS.
// Sekarang: symbol & timeframe chart disimpan, diswitch sementara, lalu DIKEMBALIKAN.

const CLI = 'node C:\\HEBAT\\tradingview-mcp\\src\\cli\\index.js';
const SYMBOL_USD = 'TVC:DXY';       // ThinkMarkets:USDINDEX tidak ter-resolve (quote N/A)
const SYMBOL_XAU = 'OANDA:XAUUSD';
const TFS = [['D1', 'D'], ['H4', '240'], ['H1', '60'], ['M15', '15'], ['M5', '5']];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function cli(args) {
  const { stdout } = await execP(`${CLI} ${args}`, { timeout: 60000, maxBuffer: 10 * 1024 * 1024 });
  return JSON.parse(stdout);
}
async function state() { try { return await cli('state'); } catch { return null; } }
async function quote(sym) { try { return await cli(`quote --symbol ${sym}`); } catch { return null; } }

// TV melaporkan D1 sebagai "1D", W1 sebagai "1W" (bukan "D"/"W").
// Hanya cocokkan utk huruf D/W supaya "15" tidak salah dianggap "5".
function tfMatch(stateTf, want) {
  const a = String(stateTf), b = String(want);
  if (a === b) return true;
  if (/^[DW]$/.test(b) && a === '1' + b) return true;
  return false;
}
function normalizeTf(tf) {
  const a = String(tf);
  if (/^1[DW]$/.test(a)) return a.slice(1);
  return a;
}

async function setSymbol(sym) {
  for (let i = 0; i < 3; i++) {
    try { await cli(`symbol --set ${sym}`); } catch {}
    for (let w = 0; w < 8; w++) {
      await sleep(1500);
      const s = await state();
      if (s && s.symbol === sym) return true;
    }
  }
  return false;
}

async function setTf(tf) {
  for (let i = 0; i < 3; i++) {
    try { await cli(`timeframe --set ${tf}`); } catch {}
    for (let w = 0; w < 8; w++) {
      await sleep(1200);
      const s = await state();
      if (s && tfMatch(s.resolution, tf)) return true;
    }
  }
  return false;
}

// Baca bars + VERIFIKASI TF tidak digeser monitor guard di tengah jalan
async function readBars(tf, count) {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!(await setTf(tf))) continue;
    let r;
    try { r = await cli(`ohlcv -n ${count}`); } catch { await sleep(2000); continue; }
    const s = await state();
    if (s && tfMatch(s.resolution, tf) && r && r.bars && r.bars.length) return r.bars;
    await sleep(1500);
  }
  return null;
}

function trend(bars) {
  if (!bars || bars.length < 5) return '?';
  const b = bars.slice(-5);
  const move = b[b.length - 1].close - b[0].open;
  const range = b.reduce((s, x) => s + (x.high - x.low), 0) / b.length;
  if (range === 0) return 'FLAT';
  if (Math.abs(move) < range * 0.15) return 'FLAT';
  return move > 0 ? 'UP' : 'DOWN';
}

function biasOf(d1, h4) {
  return d1 === 'UP' || h4 === 'UP' ? 'UP' : d1 === 'DOWN' || h4 === 'DOWN' ? 'DOWN' : 'FLAT';
}

async function scanSymbol(symbol, label) {
  const out = {};
  for (const [name, tf] of TFS) out[name] = trend(await readBars(tf, name === 'D1' ? 120 : 60));
  out._label = label;
  out._symbol = symbol;
  return out;
}

(async () => {
  // CHART LOCK: script ini MENULIS symbol chart (switch ke DXY lalu balik).
  // Kalau skrip lain sedang cycle TF / paksa M15, data jadi campur (PINE salah baca).
  if (!(await lock.acquire('usdxau_correlation', { waitMs: 300000 }))) {
    console.log('ABORT: chart masih dikunci ' + (lock.busyText() || '(tidak diketahui)') + ' - scan DXY dibatalkan.');
    process.exit(1);
  }
  const orig = await state();
  const origSymbol = orig ? orig.symbol : SYMBOL_XAU;
  const origTf = normalizeTf(orig ? orig.resolution : '15');

  console.log('');
  console.log('=== USDXAU SCAN (DXY asli - chart dikembalikan otomatis) ===');
  console.log('');

  const usdQ = await quote(SYMBOL_USD);
  const xauQ = await quote(SYMBOL_XAU);
  console.log(`USDIDX : ${usdQ ? usdQ.last : 'N/A'}  (${SYMBOL_USD})`);
  console.log(`XAUUSD : ${xauQ ? xauQ.last : 'N/A'}`);
  console.log('');

  let usd = null, xau = null, dxyRange = null;
  try {
    // ---- DXY dulu ----
    console.log('Membaca ' + SYMBOL_USD + ' ... (chart pindah sementara, mohon tunggu ~60 dtk)');
    if (await setSymbol(SYMBOL_USD)) usd = await scanSymbol(SYMBOL_USD, 'USD');
    else console.log('Gagal switch ke ' + SYMBOL_USD);

    // D1 range context
    if (usd) {
      const d1 = await readBars('D', 120);
      if (d1 && d1.length) {
        const hi = Math.max(...d1.map(b => b.high));
        const lo = Math.min(...d1.map(b => b.low));
        const now = d1[d1.length - 1].close;
        const pos = hi > lo ? Math.round(((now - lo) / (hi - lo)) * 100) : 50;
        dxyRange = { hi, lo, now, pos };
      }
    }

    // ---- XAUUSD ----
    console.log('Membaca ' + SYMBOL_XAU + ' ...');
    await setSymbol(SYMBOL_XAU);
    xau = await scanSymbol(SYMBOL_XAU, 'XAU');
  } finally {
    // ---- RESTORE selalu dijalankan ----
    try { await setSymbol(origSymbol); } catch {}
    try { await setTf(origTf); } catch {}
    const back = await state();
    console.log(`[restore] chart = ${back ? back.symbol + ' @ ' + back.resolution : 'GAGAL - cek manual'}`);
    console.log('');
    lock.release();
  }

  const usdBias = usd ? biasOf(usd.D1, usd.H4) : '?';
  const xauBias = xau ? biasOf(xau.D1, xau.H4) : '?';

  console.log('STEP 1: USDIDX / DXY (arah emas)');
  console.log('------------------------');
  if (usd) {
    for (const [name] of TFS) console.log(`USD ${name.padEnd(4)}: ${usd[name]}`);
    console.log(`=> USD Bias: ${usdBias}`);
    if (dxyRange) {
      const posZ = dxyRange.pos;
      const zonaZ = posZ >= 75 ? 'BAGIAN ATAS (USD PREMIUM)' : posZ <= 25 ? 'BAGIAN BAWAH (USD DISKON)' : 'TENGAH range';
      const implZ = posZ >= 75 ? 'USD mahal -> tekanan turun emas' : posZ <= 25 ? 'USD murah -> dukung emas' : 'netral';
      console.log(`=> DXY range 120 D1: ${dxyRange.lo} - ${dxyRange.hi} | sekarang ${dxyRange.now} = posisi ${posZ}%`);
      console.log(`   DXY di ${zonaZ} | ${implZ}`);
      if (usdBias === 'DOWN' && posZ >= 75) console.log('   CATATAN: bias DXY DOWN tapi belum di DISKON -> DXY belum konfirmasi BUY emas (tunggu CHoCH + PINE M15).');
      if (usdBias === 'UP' && posZ <= 25) console.log('   CATATAN: bias DXY UP tapi masih di DISKON -> DXY belum konfirmasi SELL emas (tunggu CHoCH + PINE M15).');
    }
    console.log('');
  } else {
    console.log('(data DXY tidak tersedia)');
    console.log('');
  }

  console.log('STEP 2: XAUUSD (keputusan)');
  console.log('---------------------------');
  if (xau) {
    for (const [name] of TFS) console.log(`XAU ${name.padEnd(4)}: ${xau[name]}`);
    console.log(`=> XAU Bias: ${xauBias}`);
    console.log('');
  }

  console.log('=== VERDICT ===');
  if (usdBias === '?' || xauBias === '?') {
    console.log('[WAIT] data tidak lengkap - ulangi scan');
  } else if (usdBias === 'UP' && xauBias === 'DOWN') {
    console.log('[SELL] DXY naik + Gold turun = CONFLUENCE (korelasi normal terbalik)');
  } else if (usdBias === 'DOWN' && xauBias === 'UP') {
    console.log('[BUY] DXY turun + Gold naik = CONFLUENCE (korelasi normal terbalik)');
  } else if (usdBias === 'FLAT' || xauBias === 'FLAT') {
    console.log('[WAIT] Salah satu flat - tunggu');
  } else if (usdBias === xauBias) {
    const rngNote = dxyRange ? ` | DXY ${dxyRange.pos}% range (${dxyRange.pos >= 75 ? 'atas/premium' : dxyRange.pos <= 25 ? 'bawah/diskon' : 'tengah'})` : '';
    console.log(`[DIVERGING] DXY ${usdBias} + XAU ${xauBias} = korelasi putus (awas reversal/sweep)${rngNote}`);
  } else {
    console.log('[UNCLEAR]');
  }
  console.log('(DXY/USD index = filter arah saja, BUKAN sinyal entry. Entry tetap gate paten 9.3: zona + PINE M15 ready=100 + CHoCH.)');
  console.log('================');
})();
