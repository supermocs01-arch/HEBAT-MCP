# DAFTAR SKRIP AKTIF — HEBAT XAUUSD

Update: 20 Okt 2026. Tujuan: AI/sesi baru tidak perlu menebak dari ~110 file `.cjs` di root.

## 1. Pipeline inti (HARUS jalan)
| Skrip | Fungsi |
|---|---|
| `hi_fitra.cjs` | Startup all-in-one ("hi fitra"): TV + backup + study id + event + health + overlay + scan + monitor |
| `analisa_gabungan.cjs` | Scan penuh 5 TF + PINE + SMC + FIBO + sweep (pakai chart_lock) |
| `baca_pine.cjs` | Baca label `PINE_DATA` dari chart |
| `monitor_limit_xau.cjs` | Monitor limit + posisi tiap 60 dtk (glitch filter, chart lock, risk guard, event guard) |
| `overlay_position.cjs` | Inject panel overlay (posisi, jatah, risk, countdown event) |
| `verify_overlay_dom.cjs` | Verifikasi panel benar-benar ada di DOM |

## 2. Pendukung
| Skrip | Fungsi |
|---|---|
| `chart_lock.cjs` | Lock chart bersama (wajib untuk penulis chart) |
| `warmup_pine.cjs` | Warm-up PINE via cycle TF dengan lock |
| `event_guard.cjs` | Baca `events.json`, hitung jendela event + countdown |
| `pine_study.cjs` | Auto-detect `pineStudyId` (ganti manual) |
| `usdxau_correlation.cjs` | Cek DXY (switch chart, restore otomatis) |
| `tv_health_check.cjs` | Health check CDP/TV |
| `backup_data.cjs` | Backup JSON + pine ke `_backup/YYYY-MM-DD` |
| `laporan_harian.cjs` | Ringkasan harian ke `laporan/YYYY-MM-DD.md` |
| `test_sistem.cjs` | Smoke test (audit + PINE + overlay + monitor + event) |
| `audit_system.cjs` | Audit struktur sistem |
| `auto_start_watch.cjs` | Watcher TV (auto overlay/scan/monitor dengan lock) |
| `full_pipeline.cjs` | Orkestrasi pipeline lama (masih dipakai hi_fitra lama) |

## 3. Data (sumber kebenaran)
`posisi.json`, `entry_hari.json`, `overlay_plan.json`, `events.json`, `risk_calculator.json`, `config.json`, `pelajaran_sl.md`, `monitor_plan_state.json` (runtime), `monitor.lock` (runtime).

## 4. Arsip / tidak dipakai
- `_arsip/` — ±140 skrip mati (draw_lines, probe, pine_paste, dll) + scratch 20 Okt (`_diag_studies.cjs`, `test_bot.cjs`, `test_minimal.cjs`).
- `_arsip_root/` — arsip cleanup besar sebelumnya.
- `tradingview-mcp/` — repo terpisah (CLI + strategi ORB yang diparkir).

## 5. Catatan
- Skrip `.cjs` lain di root adalah utilitas one-off lama. **Jangan dipindah/dihapus tanpa cek dependency** (beberapa masih dipanggil `auto_start_watch`/`full_pipeline`).
- File runtime (`monitor.lock`, `.last_resolution.json`, `monitor_plan_state.json`, `_backup/`, `laporan/`, `*.log`) sudah di `.gitignore`.
