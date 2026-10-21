# PANDUAN SETUP — Pasang HEBAT di Laptop Baru

> Untuk laptop Windows lain. Total ±30 menit. Ikuti berurutan.
> HEBAT memang Windows-only: TradingView Desktop, MT5, dan skrip pakai PowerShell/CDP port 9222.

## 0. Prasyarat (install dulu)
| Program | Cara |
|---|---|
| **Node.js LTS** (≥18) | https://nodejs.org → install, cek: `node -v` |
| **Python 3.11** | https://python.org → centang "Add to PATH", cek: `python --version` |
| **Git** | https://git-scm.com |
| **MetaTrader 5** | Install terminal, login akun (real/demo) |
| **TradingView Desktop** | Install dari tradingview.com/desktop, login |

## 1. Clone repo
```powershell
git clone https://github.com/supermocs01-arch/HEBAT-MCP.git C:\HEBAT
cd C:\HEBAT
```

## 2. Install dependensi
```powershell
npm install
pip install MetaTrader5
```

## 3. File yang TIDAK ikut repo (wajib dibuat manual)
Repo sengaja tidak menyimpan ini (rahasia/runtime):

**`runtime/mt5_auth.json`** — kredensial MT5:
```json
{ "login": 12345678, "password": "PASSWORD", "server": "Exness-MT5Trial6" }
```

`runtime/` lainnya dibuat otomatis (snapshot, lock, log). Folder laporan & backup juga terbentuk sendiri.

## 4. Indikator PINE (wajib manual di TradingView)
Indikator tidak bisa dipindah via git — pasang di TradingView Desktop:
1. Buka TradingView → Pine Editor
2. Salin isi `_arsip_root\smc_swing_paten_v2.pine` — **ITULAH versi paten v2 yang aktif** (`smc_ict_unified_v1.pine` di root = kerangka lama, jangan dipakai)
3. **Add to chart** (kalau muncul dialog "Simpan skrip?" → klik **Simpan**)
4. Catat `pineStudyId` baru: jalankan `node tradingview-mcp\src\cli\index.js state` lalu update `config.json` → `pineStudyId` (jebakan #13: id berubah setiap indikator di-add ulang)
5. Ingat: **maks 2 indikator per chart** (paket Basic, jebakan #11)

## 5. MT5 bridge (read-only)
```powershell
C:\HEBAT\services\start_bridge.cmd
```
→ menulis `runtime/mt5_snapshot.json` tiap 10 detik (akun, posisi, pending, tick).

Di MT5: aktifkan **AutoTrading (Ctrl+E)** sekali — cek `terminal_info().trade_allowed`.
Ampuh jebakan #14: jalankan MT5 **non-admin** kalau otomasi tidak lolos.

## 6. TradingView dengan CDP (port 9222)
Jalankan `hi_fitra` (langkah 7) — dia otomatis menyalakan TV dengan debugging. Kalau mau manual (Windows MSIX):
```powershell
node tradingview-mcp\src\cli\index.js tv_launch
```

## 7. STARTUP harian
```powershell
node C:\HEBAT\hi_fitra.cjs     # TV + health check + overlay + scan + start monitor
node C:\HEBAT\warmup_pine.cjs  # WAJIB setelah restart TV (jebakan #2)
```
`auto_start_watch.cjs` jalan sendiri dari `hi_fitra` — watcher overlay + monitor dengan lock anti-dobel.

## 8. Verifikasi (semua harus lolos)
```powershell
node C:\HEBAT\test_sistem.cjs      # smoke test: exit ≠0 = ada yang rusak
node C:\HEBAT\analisa_gabungan.cjs # scan penuh (PINE + SMC + FIBO)
node C:\HEBAT\risk_live.cjs        # risiko dari equity MT5
```

## 9. File inti yang ikut repo (referensi cepat)
| File | Fungsi |
|---|---|
| `hi_fitra.cjs` | Startup all-in-one |
| `analisa_gabungan.cjs` | Scan 13 modul |
| `monitor_limit_xau.cjs` | Monitor limit/posisi + guard risiko/event/timing |
| `overlay_position.cjs` / `overlay_plan.json` | Panel di chart TV (data-driven) |
| `entry_hari.json` | Jatah harian (reset manual saat ganti tanggal) |
| `pelajaran_sl.md` | SEMUA pelajaran — AI baru WAJIB baca dulu |
| `AGENTS.md` | Aturan paten + jejak (jebakan #1-#14) |
| `services/mt5_bridge.py` | Bridge MT5 read-only |
| `entry_timing.cjs` | Guard timing entry (TUNGGU/DI_ZONA/TELAT) |

## 10. Jebakan yang SUDAH diatasi kode (baca AGENTS.md #1-#14)
- Tick palsu TV, PINE `none` seusai restart, monitor dobel, race chart (lock), modal upsell 2 indikator, id PINE berubah, AutoTrading 10027 (Ctrl+E), PowerShell merusak JSON inline.

## 11. Update dari laptop lama
```powershell
cd C:\HEBAT
git pull
node C:\HEBAT\backup_data.cjs   # backup JSON lokal sebelum pakai
```
Satu-satunya file yang harus dipindah manual dari laptop lama (jangan via git): `runtime\mt5_auth.json` — salin via USB/drive, taruh di `C:\HEBAT\runtime\`.