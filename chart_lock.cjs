// ===== CHART LOCK — anti-race chart TradingView (2 Okt 2026) =====
//
// MASALAH YANG DIPERBAIKI:
//   Beberapa skrip MENULIS chart yang sama (ganti symbol / ganti timeframe):
//     - usdxau_correlation.cjs  : switch symbol ke TVC:DXY lalu balik
//     - analisa_gabungan.cjs    : cycle setResolution 1440/240/60/30/15
//     - cycle_tf_efficient.cjs  : cycle resolution
//     - warmup_pine.cjs         : cycle resolution (warm-up PINE)
//     - monitor_limit_xau.cjs   : GUARD TF paksa M15 tiap 60 detik
//   Kalau jalan bareng, chart keburu diganti di tengah baca -> PINE terbaca
//   dari symbol/TF yang salah (terbukti: PINE DXY terbaca saat scan XAUUSD).
//
// PEMAKAIAN (wajib untuk skrip yang MENULIS chart):
//   const lock = require('./chart_lock.cjs');
//   if (!(await lock.acquire('namaskrip'))) { console.log('ABORT: ' + lock.busyText()); return; }
//   try { ...kerja dengan chart... } finally { lock.release(); }
//
// PEMAKAIAN untuk skrip READ-ONLY (baca_pine, monitor):
//   const h = lock.heldBy();   // null = bebas
//   atau await lock.waitForFree(15000);

const fs = require('fs');

const PATH = 'C:/HEBAT/chart.lock';
const MAX_AGE_MS = 10 * 60 * 1000;   // lock lebih tua dari 10 mnt = basi (pemilik crash)
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let held = false;   // lock milik proses INI

function read() {
  try { return JSON.parse(fs.readFileSync(PATH, 'utf8')); } catch { return null; }
}

function pidAlive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (e) { return e.code === 'EPERM'; }   // EPERM = proses ada, bukan milik kita
}

function isStale(rec) {
  if (!rec) return true;                                  // tidak ada lock
  if (rec.pid && !pidAlive(rec.pid)) return true;         // pemilik sudah mati
  if (Date.now() - (rec.ts || 0) > MAX_AGE_MS) return true; // kelewat tua
  return false;
}

/** Info pemilik lock aktif, atau null kalau bebas/basi. */
function heldBy() { const r = read(); return isStale(r) ? null : r; }

function clearIfStale() {
  const r = read();
  if (r && isStale(r)) { try { fs.unlinkSync(PATH); } catch {} }
}

/**
 * Ambil lock. Tunggu sampai `waitMs` kalau masih dipegang skrip lain.
 * return true = berhasil, false = masih sibuk sampai batas waktu.
 */
async function acquire(owner, { waitMs = 120000, pollMs = 2000 } = {}) {
  const deadline = Date.now() + waitMs;
  for (;;) {
    clearIfStale();
    try {
      fs.writeFileSync(PATH, JSON.stringify({ owner, pid: process.pid, ts: Date.now() }), { flag: 'wx' });
      held = true;
      return true;
    } catch (e) {
      if (e.code !== 'EEXIST') { held = false; return false; }
      if (Date.now() >= deadline) { held = false; return false; }
      await sleep(pollMs);
    }
  }
}

/** Lepas lock (aman dipanggil walau tidak sedang memegang). */
function release() {
  if (!held) return;
  const r = read();
  if (r && r.pid === process.pid) { try { fs.unlinkSync(PATH); } catch {} }
  held = false;
}

/** Tunggu sampai chart bebas. return false kalau masih sibuk setelah `ms`. */
async function waitForFree(ms = 30000) {
  const deadline = Date.now() + ms;
  while (heldBy()) {
    if (Date.now() >= deadline) return false;
    await sleep(1500);
  }
  return true;
}

/** Teks manusia untuk pesan error: "namaskrip (pid 1234, 12 dtk lalu)". */
function busyText() {
  const h = heldBy();
  return h ? `${h.owner} (pid ${h.pid}, ${Math.round((Date.now() - (h.ts || Date.now())) / 1000)} dtk lalu)` : null;
}

module.exports = { acquire, release, heldBy, waitForFree, busyText, PATH, clearIfStale };
