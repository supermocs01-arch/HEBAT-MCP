// ===== WARM-UP PINE (jebakan #2 AGENTS.md) =====
// Setelah restart TV, indikator PINE sering menampilkan 'none' di SEMUA timeframe.
// Itu glitch tampilan, BUKAN sinyal. Solusinya: cycle timeframe sekali (warm-up).
//
// Versi INI memakai chart_lock supaya TIDAK bentrok dengan:
//   - monitor_limit_xau.cjs (GUARD TF paksa M15 tiap 60 dtk)
//   - analisa_gabungan.cjs (cycle TF saat scan)
//   - usdxau_correlation.cjs (switch symbol ke DXY)
//
// PAKAI INI, jangan tulis loop 'timeframe --set' manual di terminal:
//   node C:\HEBAT\warmup_pine.cjs

const lock = require('./chart_lock.cjs');
const { exec } = require('child_process');
const execP = require('util').promisify(exec);

const CLI = 'node C:\\HEBAT\\tradingview-mcp\\src\\cli\\index.js';
const TFS = ['D', '240', '60', '30', '15'];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function cli(args) {
  const { stdout } = await execP(`${CLI} ${args}`, { timeout: 60000, maxBuffer: 10 * 1024 * 1024 });
  return JSON.parse(stdout);
}
async function state() { try { return await cli('state'); } catch { return null; } }

(async () => {
  const got = await lock.acquire('warmup_pine', { waitMs: 120000 });
  if (!got) {
    console.log('ABORT: chart masih dikunci ' + (lock.busyText() || '(tidak diketahui)'));
    console.log('Tunggu skrip itu selesai, lalu jalankan ulang warmup_pine.cjs');
    process.exit(1);
  }
  try {
    const orig = await state();
    console.log('chart awal : ' + (orig ? orig.symbol + ' @ ' + orig.resolution : '?'));

    for (const tf of TFS) {
      try { await cli(`timeframe --set ${tf}`); } catch {}
      await sleep(4500);
      const s = await state();
      console.log('  set ' + tf.padEnd(4) + ' -> ' + (s ? s.resolution : '?'));
    }

    // Kembali ke M15 = GUARD TF yang dipakai monitor
    try { await cli('timeframe --set 15'); } catch {}
    await sleep(3000);
    const fin = await state();
    console.log('chart akhir : ' + (fin ? fin.symbol + ' @ ' + fin.resolution : '?'));
    console.log('');
    console.log('WARM-UP SELEGAU. Sekarang baca PINE: node C:\\HEBAT\\baca_pine.cjs');
  } finally {
    lock.release();
  }
})();
