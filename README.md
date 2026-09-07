# SMC×ICT Unified Fitra XAUUSD v1.0

> Trading system gabungan SMC klasik (Paten Fitra) + ICT (Inner Circle Trader) untuk XAUUSD di akun cent OANDA.

## 📋 Overview

| Item | Value |
|------|-------|
| **Target** | XAUUSD (Gold) |
| **Broker** | OANDA |
| **Account** | Cent (2,000 USC) |
| **Strategy** | Paten Fitra v1.0 |
| **Pine Script** | `smc_ict_unified_v1.pine` (524 baris) |
| **Study ID** | `SMC_ICT_FITRA_XAUUSD_V1` |
| **Version** | 1.0 (3 Sep 2026) |

## 🏗️ Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│  TradingView Desktop (CDP :9222)                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  smc_ict_unified_v1.pine                             │    │
│  │  ├─ M1: Struktur SMC (BOS/CHoCH)                    │    │
│  │  ├─ M2: Sweep Likuiditas                            │    │
│  │  ├─ M3: FVG & OB state                              │    │
│  │  ├─ M4: Range Premium/Diskon                        │    │
│  │  ├─ M5: FIBO + ICT OTE                              │    │
│  │  ├─ M6: Filter Pelajaran Fitra                      │    │
│  │  ├─ M6B: MTF trend (placeholder)                    │    │
│  │  ├─ M7: ICT Kill Zones                              │    │
│  │  ├─ M8: Power of 3 (PO3)                            │    │
│  │  ├─ M9: Verdict Engine                              │    │
│  │  └─ M10: Output grafik + label PINE_DATA            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              ↓ CDP WebSocket
┌─────────────────────────────────────────────────────────────┐
│  Analyzer (Node.js)                                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  baca_pine_json.cjs    → baca label via CDP         │    │
│  │  scan_all_tf.cjs       → cycle TF + baca per-TF     │    │
│  │  cycle_tf_efficient.cjs → cycle D/240/60/30/15/M5  │    │
│  │  monitor_limit_xau.cjs → pantau limit + posisi       │    │
│  │  analisa_gabungan.cjs  → SMC analyzer + verdict     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  MT5 (OANDA Cent)                                            │
│  └─ Eksekusi trade otomatis via alert webhook                │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start (untuk AI baru)

### 1. Pastikan TradingView jalan dengan CDP:
```bash
node C:\HEBAT\hi_fitra.cjs
```

### 2. Add Pine Script ke chart:
- Buka TradingView Desktop
- Buka chart XAUUSD
- Buka Pine Editor (bagian bawah)
- Copy seluruh isi `C:\HEBAT\smc_ict_unified_v1.pine`
- Paste → Save → Add to chart
- **Catat Study ID baru** (lihat di pojok kiri chart "SMC×ICT Unified v1")

### 3. Update `config.json`:
```json
{
  "pineStudyId": "STUDY_ID_BARU_DARI_LANGKAH_2"
}
```

### 4. Cycle timeframe (warm-up PINE):
```bash
node C:\HEBAT\cycle_tf_efficient.cjs
```

### 5. Test koneksi analyzer:
```bash
node C:\HEBAT\baca_pine_json.cjs
```
Harus muncul JSON dengan field `sig`, `px`, `rsi`, `alasan`, dll.

### 6. Scan penuh:
```bash
node C:\HEBAT\analisa_gabungan.cjs
```

### 7. Start monitor (background):
```bash
node C:\HEBAT\monitor_limit_xau.cjs
```

## 📁 File Penting

| File | Fungsi |
|------|--------|
| `config.json` | Konfigurasi Study ID + metadata |
| `smc_ict_unified_v1.pine` | Pine Script utama (524 baris) |
| `baca_pine_json.cjs` | Baca label PINE_DATA_JSON dari chart |
| `scan_all_tf.cjs` | Scan PINE di semua TF |
| `cycle_tf_efficient.cjs` | Cycle timeframe (warm-up) |
| `monitor_limit_xau.cjs` | Monitor limit pending + posisi aktif |
| `analisa_gabungan.cjs` | SMC analyzer + verdict gabungan |
| `overlay_plan.json` | Plan limit pending (BUY/SELL) |
| `posisi.json` | Posisi live (BUY/SELL aktif) |
| `entry_hari.json` | Jatah harian (max 3 entry, stop setelah 2 loss) |

## 🎨 Visual Indicators (semua built-in di Pine)

### Selalu Tampil:
- **Mid Range** (garis kuning)
- **FIBO 61.8% / 78.6%** (garis aqua/biru)
- **OTE Lo/Hi** (garis fuchsia dashed)
- **Pivot** (diamond kuning/cyan di swing points)
- **Status "SMC×ICT v1 OK"** (pojok kanan atas)
- **Tabel MTF+ICT** (pojok kiri atas)
- **S/R Lines** (merah/hijau, extend right)

### Muncul Saat Kondisi Terpenuhi:
- **FVG boxes** (hijau/merah)
- **OB boxes** (hijau/merah)
- **BOS-B / BOS-S** labels
- **CH-B / CH-S** labels
- **SWEEP↑ / SWEEP↓** labels
- **★SB★** (Silver Bullet)
- **MANIP** (Power of 3 manipulation)
- **JUDAS↑ / JUDAS↓** (Judas Swing)
- **BUY✓ / SELL✓** (sinyal valid)
- **BUYx / SELLx** (sinyal agresif, 70% transparent)
- **Kill Zone background** (London/NY AM/NY Lunch/Asia)

## 📊 Output untuk Analyzer

### Label `PINE_DATA|` (legacy, pipe-delimited):
```
PINE_DATA|4310.4|45.2|FLAT|0|8.5|NO_SETUP|DISKON|4374.5|NaN|NaN|NaN|LONDON|BULL|BEAR|BEAR|BULL
```

### Label `PINE_DATA_JSON|` (JSON lengkap):
```json
{"v":"1.0","px":4310.4,"rsi":45.2,"sig":"FLAT","ready":0,"atr":8.5,"alasan":"NO_SETUP","zona":"DISKON","mid":4374.5,"sl":4225.0,"tp1":4374.0,"tp2":4458.0,"sesi":"LONDON","kz":"LONDON","sb":false,"po3":"DIST","judas":"-","oteLo":4320.5,"oteHi":4345.2,"obBull":[4282.6,4326.8],"obBear":[4229.9,4371.8],"fvgBull":[[4280,4300]],"fvgBear":[[4472,4564]],"sh":4367.3,"sl":4287.4,"mtf":"BEAR|BEAR|FLAT|BULL","t":1725287400}
```

## ⚠️ Catatan Penting untuk AI Baru

1. **MTF tidak pakai `request.security()`** — bug-nya return NA setelah restart. Solusi: cycle TF + baca PINE_DATA per-TF via CDP.

2. **Study ID bisa berubah** setiap kali Add to chart. Selalu update `config.json` setelah paste.

3. **Jatah harian**: max 3 entry, **STOP setelah 2 loss** (anti balas dendam).

4. **SL struktural** (di luar sweep/swing + buffer), JANGAN 10 pips kaku.

5. **BUY hanya di DISKON**, **SELL hanya jika D1 BEARISH + PREMIUM**.

6. **Entry tanpa konfirmasi = AGRESIF** (MISS #12) — catat & siap cut cepat.

## 🔧 Perintah Cepat

```bash
# Startup lengkap (TV + overlay + scan + monitor)
node C:\HEBAT\hi_fitra.cjs

# Scan pasar
node C:\HEBAT\analisa_gabungan.cjs

# Baca PINE JSON dari chart aktif
node C:\HEBAT\baca_pine_json.cjs

# Cycle TF (warm-up)
node C:\HEBAT\cycle_tf_efficient.cjs

# Update overlay (setelah edit posisi.json/overlay_plan.json)
node C:\HEBAT\overlay_position.cjs

# Cek log monitor
type C:\HEBAT\monitor_limit_xau.log

# Restart TV + cycle TF
taskkill /F /IM TradingView.exe
node C:\HEBAT\hi_fitra.cjs
node C:\HEBAT\cycle_tf_efficient.cjs
```

## 📚 Dokumentasi Tambahan

- `KNOWLEDGE_BASE.md` — Single source of truth (consolidated)
- `BUG_AUDIT.md` — Daftar bug yang sudah ditemukan + fix
- `SMC_ICT_FRAMEWORK.md` — Dokumentasi framework lengkap
- `pelajaran_sl.md` — Semua MISS #1-#13 (pelajaran dari loss)
- `AGENTS.md` — Legacy documentation (lihat KNOWLEDGE_BASE untuk yang terbaru)
