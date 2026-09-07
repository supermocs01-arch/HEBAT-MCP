# HEBAT MCP - Panduan File

> Repositori bersih. Semua file penting ada di root. File lama diarsipkan.

---

## STRUKTUR REPO

```
HEBAT-MCP/
├── [AKTIF] File inti trading (32 file)
├── _arsip/          File arsip lama (~137 file)
├── _arsip_root/     File utility diarsipkan (~152 file)
├── tradingview-mcp/ Sistem MCP
└── node_modules/    Dependency
```

---

## FILE AKTIF (32 FILE)

### 📂 Trading Scripts (10 file)

| File | Fungsi | Pakai |
|------|--------|-------|
| `usdxau_correlation.cjs` | Scan USDIDX → arah Gold (D1→H4→H1→M15→M5) | Setiap scan |
| `analisa_gabungan.cjs` | Scan penuh XAUUSD (PINE + SMC + RSI + FIBO) | Setiap scan |
| `baca_pine.cjs` | Baca PINE verdict dari chart TV | Setiap scan |
| `overlay_position.cjs` | Update panel overlay di chart | Setelah edit data |
| `monitor_limit_xau.cjs` | Pantau posisi & limit 24/7 | Monitoring |
| `cycle_tf_efficient.cjs` | Warm-up PINE (fix none) | Setelah TV restart |
| `hi_fitra.cjs` | Startup lengkap (semua dalam 1) | Buka PC pertama |
| `auto_start_watch.cjs` | Auto-start background | Biarkan jalan |
| `verify_overlay_dom.cjs` | Cek overlay muncul di DOM | Troubleshooting |
| `hitung.cjs` | Kalkulator risk management | Planning |

### 📂 Data Files (6 file)

| File | Fungsi | Update |
|------|--------|--------|
| `posisi.json` | Posisi aktif (entry, SL, TP) | Setiap event |
| `overlay_plan.json` | Plan limit order | Manual |
| `entry_hari.json` | Jatah harian (3 entry, 2 loss stop) | Manual reset harian |
| `trade_log.json` | Riwayat trade | Append only |
| `zona_history.json` | Riwayat zona | Append only |
| `monitor.lock` | PID monitor aktif (anti duplikat) | Auto |

### 📂 Dokumentasi (8 file)

| File | Fungsi | Baca |
|------|--------|------|
| `FILE_GUIDE.md` | Panduan semua file (INI) | Pertama |
| `README.md` | Overview + quick start | Pertama |
| `SETUP.md` | Instalasi PC baru | Setup |
| `AGENTS.md` | Instruksi AI agent | AI |
| `PATEN.md` | Aturan trading (kitab) | WAJIB |
| `pelajaran_sl.md` | Lessons dari loss (MISS #1-14) | Setiap loss |
| `pengetahuan_fibo.md` | Aturan Fibonacci | Referensi |
| `KNOWLEDGE_BASE.md` | Dokumentasi lengkap | Referensi |
| `SNIPER.md` | Strategi sniper | Referensi |

### 📂 Pine Script (1 file)

| File | Fungsi | Versi |
|------|--------|-------|
| `smc_ict_unified_v1.pine` | Indikator utama | **v1.1** (rekomendasi) |

### 📂 Sistem (3 file)

| File | Fungsi |
|------|--------|
| `tradingview-mcp/` | MCP CLI untuk TradingView |
| `package.json` | Dependency |
| `.gitignore` | Git ignore |

---

## DAILY WORKFLOW

```
Buka PC → Nyalakan TradingView
    │
    ├─1─> node C:\HEBAT\usdxau_correlation.cjs
    │       => USDIDX D1→H4→H1→M15→M5
    │       => Dapat arah (UP/DOWN/FLAT)
    │
    ├─2─> node C:\HEBAT\analisa_gabungan.cjs
    │       => XAUUSD full scan
    │       => PINE + SMC + RSI + FIBO + FVG
    │
    ├─3─> node C:\HEBAT\baca_pine.cjs
    │       => Verdict final PINE
    │
    └─4─> node C:\HEBAT\overlay_position.cjs
            => Update chart panel
```

---

## COMMAND REFERENCE

```bash
# === SCAN ===
node C:\HEBAT\usdxau_correlation.cjs   # 1. USD arah
node C:\HEBAT\analisa_gabungan.cjs     # 2. XAU full
node C:\HEBAT\baca_pine.cjs            # 3. PINE verdict

# === UPDATE & MONITOR ===
node C:\HEBAT\overlay_position.cjs     # Update chart
node C:\HEBAT\monitor_limit_xau.cjs    # Pantau posisi

# === WARM-UP & FIX ===
node C:\HEBAT\cycle_tf_efficient.cjs   # Fix PINE none
node C:\HEBAT\hi_fitra.cjs             # Startup lengkap

# === CEK LOG ===
Get-Content C:\HEBAT\monitor_limit_xau.log -Tail 20
```

---

## VERDICT INTERPRETATION

### usdxau_correlation.cjs
| Verdict | Arti | Aksi |
|---------|------|------|
| SELL | USD↑ + Gold↓ = confluence | Prepare SELL |
| BUY | USD↓ + Gold↑ = confluence | Prepare BUY |
| DIVERGING | USD & Gold sama arah | TUNGGU |
| FLAT | Tidak ada trend | TUNGGU |

### analisa_gabungan.cjs
| Verdict | Arti |
|---------|------|
| NO ENTRY | Jangan trading |
| PULLBACK D1 VALID | Pullback di trend besar |
| SETUP VALID | Entry bagus, boleh |
| AGRESIF | Entry berisiko |

### baca_pine.cjs
| sig | ready | Arti |
|-----|-------|------|
| FLAT | 0 | Tidak ada setup |
| BUY | 100 | Konfirmasi penuh |
| SELL | 100 | Konfirmasi penuh |
| BUY | 50 | Agresif, risiko tinggi |

---

## TROUBLESHOOTING

| Masalah | Solusi |
|---------|--------|
| PINE FLAT/none | `node C:\HEBAT\cycle_tf_efficient.cjs` |
| Overlay tidak muncul | `node C:\HEBAT\overlay_position.cjs` |
| Monitor error | `type C:\HEBAT\monitor.lock` → restart |
| TV tidak konek | `taskkill /F /IM TradingView.exe` → `hi_fitra.cjs` |

---

## ARSIP (_arsip/ + _arsip_root/)

File di folder arsip TIDAK dipakai lagi. Total **~289 file** diarsipkan karena:

- Utility one-off (probe_*, debug_*, check_*)
- File temporary (.log, .png, .txt)
- Versi lama Pine Script
- Script deploy/development

**Jangan hapus folder arsip** — masih bisa dipakai sebagai reference jika needed.

---

## FILE COUNT

```
Aktif:      32 file
Arsip:     289 file
Total:     321 file
```

Repositori sekarang **bersih dan efisien**.
