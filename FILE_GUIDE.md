# HEBAT MCP - Panduan File

> Dokumentasi semua file inti berurutan sesuai fungsi.

---

## 1. ALUR KERJA HARIAN

```
Bangun → Buka PC → Nyalakan TradingView
    │
    ├─1─> usdxau_correlation.cjs   ← "Kemana USDIDX arahnya?"
    │
    ├─2─> analisa_gabungan.cjs      ← "Market XAUUSD bagaimana?"
    │
    ├─3─> baca_pine.cjs            ← "PINE bilang apa?"
    │
    └─4─> overlay_position.cjs     ← "Update chart overlay"
    
Trading → Pantau posisi
    │
    └─> monitor_limit_xau.cjs      ← "Awasi limit & posisi 24/7"
```

---

## 2. FILE UTAMA (PAKAI SETIAP HARI)

### usdxau_correlation.cjs
**Fungsi:** Cek USDIDX dulu untuk tahu arah Gold.

**Cara baca output:**
```
STEP 1: USDIDX (arah Gold)
------------------------
USD D1 : DOWN    ← Trend Daily
USD H4 : DOWN    ← Trend H4
USD H1 : DOWN    ← Trend H1
USD M15: DOWN    ← Trend M15
USD M5 : DOWN    ← Trend M5
=> USD Bias: DOWN

STEP 2: XAUUSD (keputusan)
---------------------------
XAU D1 : DOWN
XAU H4 : DOWN
XAU H1 : DOWN
XAU M15: DOWN
XAU M5 : DOWN
=> XAU Bias: DOWN

=== VERDICT ===
[DIVERGING] USD DOWN, XAU DOWN = diverging
```

**Arti verdict:**
| Verdict | Arti | Aksi |
|---------|------|------|
| SELL | USD naik + Gold turun = confluence | Prepare SELL |
| BUY | USD turun + Gold naik = confluence | Prepare BUY |
| DIVERGING | USD & Gold sama arah | TUNGGU |
| FLAT | Tidak ada trend | TUNGGU |

**Pakai:**
```bash
node C:\HEBAT\usdxau_correlation.cjs
```

---

### analisa_gabungan.cjs
**Fungsi:** Scan pasar FULL - semua timeframe, PINE, SMC, RSI, FIBO, FVG, sweep.

**Output (singkat):**
```
[1440] PINE:FLAT | ANALYZER: trend=BEARISH sig=FLAT
   SMC: BOS-B=N CHoCH-B=N | OB=BEARISH | FVG=tidak ada
   FIBO: 61.8=4458.5 | zona=DISKON
   
[240] trend=BULLISH sig=BUY_CHOCH ready=68%
   CHoCH-B=Y | FVG=BULLISH 4399.2-4405.3
```

**Arti:**
- `PINE:FLAT` = Tidak ada sinyal
- `trend=BEARISH` = Harga di bawah mid = DISKON (untuk BUY)
- `sig=BUY_CHOCH` = Sinyal BUY dengan konfirmasi CHoCH
- `ready=68%` = Masih perlu konfirmasi lebih

**Verdict akhir:**
| Verdict | Arti |
|---------|------|
| NO ENTRY | Jangan trading |
| PULLBACK D1 VALID | Pullback di trend besar =有机会 |
| SETUP VALID | Entry bagus, boleh trading |
| AGRESIF | Boleh entry tapi berisiko |

**Pakai:**
```bash
node C:\HEBAT\analisa_gabungan.cjs
```

---

### baca_pine.cjs
**Fungsi:** Baca data PINE langsung dari chart.

**Output:**
```
PINE_DATA_JSON|{"px":4419.5,"rsi":60,"sig":"FLAT","ready":0,
"zona":"DISKON","mid":4438.3,"alasan":"NO_SETUP",
"mtf":"BEAR|BEAR|BEAR|BEAR|BEAR"}
```

**Field penting:**
| Field | Arti |
|-------|------|
| `px` | Harga sekarang |
| `rsi` | RSI (50=netral, <30=oversold, >70=overbought) |
| `sig` | Signal: BUY / SELL / FLAT |
| `ready` | 0=belum valid, 50=agresif, 100=valid penuh |
| `zona` | DISKON (harga < mid) / PREMIUM (harga > mid) |
| `mtf` | Trend per TF: D1|H4|H1|M15|M15 |

**Pakai:**
```bash
node C:\HEBAT\baca_pine.cjs
```

---

### overlay_position.cjs
**Fungsi:** Tampilkan panel info di chart TradingView.

**Yang ditampilkan:**
- Posisi aktif (entry, SL, TP, floating)
- Plan limit (jika ada)
- Sisa jatah entry harian

**Pakai:**
```bash
node C:\HEBAT\overlay_position.cjs
```

**Catatan:** Edit `posisi.json` atau `overlay_plan.json` dulu sebelum jalankan.

---

### monitor_limit_xau.cjs
**Fungsi:** Pantau posisi & limit setiap 60 detik secara otomatis.

**Yang dipantau:**
- Limit order: apakah sudah terpenuhi
- Posisi aktif: floating profit/loss
- SL/TP: apakah tersentuh

**Cek log:**
```bash
Get-Content C:\HEBAT\monitor_limit_xau.log -Tail 30
```

**Pakai:**
```bash
node C:\HEBAT\monitor_limit_xau.cjs
```

---

## 3. FILE PENDUKUNG (TIDAK TIAP HARI)

### hi_fitra.cjs
**Fungsi:** STARTUP KOMPLIT - nyalakan TV + check + overlay + scan dalam 1 command.

**Pakai:** Hanya saat pertama kali buka PC / restart TV.
```bash
node C:\HEBAT\hi_fitra.cjs
```

---

### cycle_tf_efficient.cjs
**Fungsi:** Warm-up PINE. Diperlukan setelah TV restart karena PINE sering return NA.

**Masalah yang diatasi:**
- Buka chart → PINE显示 "none" di semua TF
- Solution: cycle timeframe D1→H4→H1→M15→M5

**Pakai:**
```bash
node C:\HEBAT\cycle_tf_efficient.cjs
```

---

### auto_start_watch.cjs
**Fungsi:** Background watcher. Kalau TV mati lalu nyala lagi, auto jalankan sequence.

**Flow:**
```
TV restart detected
    ↓
cycle_tf_efficient.cjs  (warm-up)
    ↓
overlay_position.cjs    (update panel)
    ↓
monitor_limit_xau.cjs    (start monitoring)
```

**Pakai:** Jalankan sekali saat PC nyala, lalu biarkan jalan di background.
```bash
node C:\HEBAT\auto_start_watch.cjs
```

---

### hitung.cjs
**Fungsi:** Kalkulator risk management.

**Hinpute:**
- Harga entry
- Harga SL
- Lot size
- Saldo account

**Output:**
- Risk dalam USC (dollar cent)
- Risk dalam persen
- RR ratio

---

### verify_overlay_dom.cjs
**Fungsi:** Cek apakah overlay sudah muncul di chart (untuk debugging).

**Pakai:** Kalau overlay_position.cjs dijalankan tapi tidak muncul.
```bash
node C:\HEBAT\verify_overlay_dom.cjs
```

---

## 4. FILE DATA

### posisi.json
**Isi:** Posisi yang sedang aktif.

**Format:**
```json
{
  "active": true,
  "entry": 4380,
  "title": "XAUUSD - SELL 4.380 SAMPAI TP 4.200",
  "sl": "4434",
  "tp1": "4353",
  "tp2": "4310",
  "tp3": "4280",
  "tp_extend": "4200",
  "status": "AKTIF - menunggu H4 close <4.380"
}
```

**WAJIB UPDATE setiap:**
- Entry terpenuhi
- SL tersentuh
- TP1/TP2/TP3 tersentuh
- Tutup manual

---

### overlay_plan.json
**Isi:** Plan limit order yang mau dipasang.

**Format:**
```json
{
  "active": true,
  "title": "BUY LIMIT 4407",
  "info": "Zona diskon | D1 bullish",
  "sl": "4397",
  "tp1": "4695",
  "tp2": "4705",
  "syarat": "PINE M15 BUY + CHoCH-B",
  "status": "LIMIT BARU: menunggu kena"
}
```

---

### entry_hari.json
**Isi:** Jatah trading harian.

**Format:**
```json
{
  "tanggal": "2026-09-07",
  "entry_ke": 1,
  "sisa_jatah": 2,
  "loss_count": 0
}
```

**Reset:** Otomatis tidak. Manual setiap pagi baru.

**Aturan:**
- Max 3 entry/hari
- 2 loss = STOP TOTAL hari itu

---

## 5. ATURAN PATEN (WAJIB BACA)

### PATEN.md
File ini adalahkitab. Semua aturan ada di sini:

| Aturan | Penjelasan |
|--------|------------|
| BUY hanya di DISKON | Harga < mid range |
| SELL hanya di PREMIUM | Harga > mid range + D1 BEARISH |
| SL struktural | Di luar swing/sweep + buffer 5-10 pip |
| TP minimal 1:3 | TP1 = 1:3, TP2 = 1:4 |
| Max 3 entry/hari | 2 loss = stop total |
| Entry = LIMIT ORDER | Bukan market order (kecuali scalp chase) |
| Layer ≠ jatah | 2 layer @0.05 = 1 jatah |

---

### pelajaran_sl.md
Kumpulan lessons dari semua loss. Setiap kali loss:
1. Catat di pelajaran_sl.md (format: lihat MISS #12)
2. Baru lanjut analisa

---

## 6. COMMAND CEPAT

```bash
# === SCAN (rutin) ===
node C:\HEBAT\usdxau_correlation.cjs   # 1. USD arah
node C:\HEBAT\analisa_gabungan.cjs     # 2. XAU full
node C:\HEBAT\baca_pine.cjs            # 3. PINE verdict

# === UPDATE CHART ===
node C:\HEBAT\overlay_position.cjs     # Setelah edit posisi.json

# === MONITOR ===
node C:\HEBAT\monitor_limit_xau.cjs    # Pantau posisi

# === FIX / WARM-UP ===
node C:\HEBAT\cycle_tf_efficient.cjs   # PINE none fix
node C:\HEBAT\hi_fitra.cjs             # Startup lengkap

# === CEK LOG ===
Get-Content C:\HEBAT\monitor_limit_xau.log -Tail 20
```

---

## 7. TROUBLESHOOTING

| Masalah | Solusi |
|---------|--------|
| PINE显示 "FLAT" atau "none" | `node C:\HEBAT\cycle_tf_efficient.cjs` |
| Overlay tidak muncul | `node C:\HEBAT\overlay_position.cjs` |
| Monitor error | `type C:\HEBAT\monitor.lock` → cek PID |
| TV tidak konek | `taskkill /F /IM TradingView.exe` → `node C:\HEBAT\hi_fitra.cjs` |

---

## 8. DAFTAR FILE INTI

| File | Fungsi | Pakai |
|------|--------|-------|
| `usdxau_correlation.cjs` | Scan USDIDX → arah Gold | Setiap scan |
| `analisa_gabungan.cjs` | Scan penuh XAUUSD | Setiap scan |
| `baca_pine.cjs` | Baca PINE verdict | Setiap scan |
| `overlay_position.cjs` | Update chart panel | Setelah edit data |
| `monitor_limit_xau.cjs` | Pantau posisi 24/7 | Monitoring |
| `cycle_tf_efficient.cjs` | Warm-up PINE | Setelah TV restart |
| `hi_fitra.cjs` | Startup lengkap | Pertama buka PC |
| `auto_start_watch.cjs` | Auto-start background | Biarkan jalan |
| `hitung.cjs` | Kalkulator risk | Saat planning |
| `verify_overlay_dom.cjs` | Debug overlay | Troubleshooting |

---

## 9. ARSIP

Folder `_arsip/` = ~140 file lama (tidak dipakai).

Folder root `C:\HEBAT\` = banyak .cjs utilitas lama. File aktif hanya yang ada di daftar di atas.
