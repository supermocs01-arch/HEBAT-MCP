// get_study_id.cjs - Deteksi otomatis ID studi "SMC SWING PATEN" di chart TV.
// Hasil disimpan ke config.json (pineStudyId) supaya skrip lain tidak pernah
// rusak lagi saat ID studi berubah (kejadian 25 Aug: PTdIuB -> kgcsqn).
const { execFileSync } = require('child_process');
const fs = require('fs');

const CFG = 'C:/HEBAT/config.json';

function currentId() {
  const out = execFileSync(process.execPath, ['C:/HEBAT/tradingview-mcp/src/cli/index.js', 'state'], { encoding: 'utf8', timeout: 30000 });
  const j = JSON.parse(out);
  if (!j.success || !j.studies) return null;
  const st = j.studies.find(s => /SMC SWING PATEN/i.test(s.name));
  return st ? st.id : null;
}

try {
  const id = currentId();
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(CFG, 'utf8')); } catch (e) {}
  if (id) {
    if (cfg.pineStudyId !== id) {
      cfg.pineStudyId = id;
      cfg.pineStudyUpdatedAt = new Date().toISOString();
      fs.writeFileSync(CFG, JSON.stringify(cfg, null, 2));
      console.log('config.json diperbarui: pineStudyId=' + id);
    } else {
      console.log('pineStudyId tidak berubah: ' + id);
    }
  } else {
    console.log('Studi SMC SWING PATEN tidak ditemukan di chart!');
    process.exit(1);
  }
} catch (e) {
  console.error('ERROR: ' + e.message);
  process.exit(1);
}
