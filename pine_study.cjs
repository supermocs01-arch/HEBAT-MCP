const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CLI = path.join(__dirname, 'tradingview-mcp', 'src', 'cli', 'index.js');
const CFG = path.join(__dirname, 'config.json');
const RE = /(SMC|PATEN)/i;

function state() {
  const out = execFileSync(process.execPath, [CLI, 'state'], { timeout: 60000, encoding: 'utf8', windowsHide: true });
  return JSON.parse(out.replace(/^\uFEFF/, ''));
}

function detect(opts) {
  const quiet = !!(opts && opts.quiet);
  let st;
  try { st = state(); } catch (e) { return { ok: false, reason: 'state gagal: ' + e.message }; }
  const studies = st.studies || [];
  const hit = studies.find(s => RE.test(s.name || ''));
  if (!hit) return { ok: false, reason: 'study SMC tidak ada di chart (studi: ' + (studies.map(s => s.name).join(' | ') || 'kosong') + ')' };

  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(CFG, 'utf8')); } catch (e) {}
  const prev = cfg.pineStudyId;
  const changed = prev !== hit.id;
  if (changed) {
    cfg.pineStudyId = hit.id;
    cfg.pineStudyName = hit.name;
    cfg.pineStudyUpdatedAt = new Date().toISOString();
    cfg.pineStudyNote = 'Auto-detect ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC: id ' + (prev || '(kosong)') + ' -> ' + hit.id + '.';
    try { fs.writeFileSync(CFG, JSON.stringify(cfg, null, 2) + '\n'); } catch (e) {}
    if (!quiet) console.log('[pine_study] id diperbarui: ' + (prev || '(kosong)') + ' -> ' + hit.id + ' (' + hit.name + ')');
  } else if (!quiet) {
    console.log('[pine_study] id OK: ' + hit.id + ' (' + hit.name + ')');
  }
  return { ok: true, id: hit.id, name: hit.name, changed, previous: prev };
}

module.exports = { detect, state };

if (require.main === module) {
  const r = detect({ quiet: true });
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.ok ? 0 : 1);
}
