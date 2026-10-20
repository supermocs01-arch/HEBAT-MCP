# Changelog

Semua perubahan penting sistem HEBAT dicatat di sini.
Format tanggal: YYYY-MM-DD (WIB).

## [Unreleased]

## [0.4.0] - 2026-10-20

### Ditambah
- **MT5 bridge read-only** (`services/mt5_bridge.py`): snapshot akun, posisi, pending order, dan tick ke `runtime/mt5_snapshot.json` tiap 10 detik (atomic write, lock file, mode `--once`, auto-reconnect). Tidak pernah mengirim order.
- **`services/mt5_test.py`**: diagnostik read-only (login, akun, posisi, simbol XAU).
- **`services/mt5_env.py`** dan **`services/mt5_doctor.py`**: samakan versi paket pip dengan build terminal, cek proses/build/cache updater.
- **`risk_live.cjs`**: tabel risiko dari equity MT5 (2%) — max lot per SL, risk USD/IDR, deteksi posisi tanpa SL.
- **`entry_timing.cjs`**: guard ketepatan entry — `TUNGGU` / `DI_ZONA` / `TELAT` / `INVALID` / `EXPIRED`, dengan `maxChase` 0.45 x ATR M15.
- **`pembukuan_2026-11-21.md`**: kerangka pembukuan/evaluasi trade (fill, slip, PINE/CHoCH saat fill, R multiple, MFE/MAE, skor timing).
- `config.json` blok `mt5` (mode shadow, simbol `XAUUSDm`, polling 10 dtk) + catatan akun demo.

### Diperbaiki
- **Risk guard monitor** kini memakai **equity MT5** (bukan angka config statis), dan mendeteksi mismatch akun: kalau MT5 = demo sementara `posisi.json` = real, guard otomatis kembali ke angka config.
- **Monitor** memantau **2 layer** (`layers[]` di `overlay_plan.json`) tanpa duplikasi dengan `plan_a_sell`.
- **Encoding**: karakter em dash di log monitor/`entry_timing` diganti ASCII agar tidak mojibake di PowerShell.
- **AGENTS.md**: modul & perintah baru, ditambah jebakan #14 (AutoTrading OFF = retcode 10027, Ctrl+E, terminal non-admin, kredensial demo di `runtime/`).
- `services/__pycache__` tidak lagi ikut ter-commit (`.gitignore`).

### Diuji
- Login API MT5 demo `414469397` (Exness-MT5Trial6, IDR, leverage 1:2000) — **berhasil**.
- Trade test market BUY 0.01 `XAUUSDm` @4123.513 lalu close @4123.666 — **+Rp2.873**, bridge mencatat posisi 1 → 0.
- Pending order test: 2 layer SELL LIMIT 4145 / 4150.5, SL 4161, TP 4097 / 4073.5 — tampil di snapshot bridge dan monitor.
- Smoke test: **7/7 PASS**. Audit sistem: **PASS 45 / WARN 2 / FAIL 0**.

### Catatan
- Semua eksekusi di atas dilakukan di akun **DEMO**. Akun real (Rp24.000.000) belum terhubung ke bridge.
- Batas risiko tetap 2%: real $30 (~Rp480.000); 0.01 lot = $1 per 1.00 poin harga (kontrak 100 oz).

## [0.3.0] - 2026-10-20 (sebelumnya)
- Risk guard lot, event guard (`events.json` + countdown overlay), auto-detect `pineStudyId`, backup data, laporan harian, smoke test, cleanup dokumen.
