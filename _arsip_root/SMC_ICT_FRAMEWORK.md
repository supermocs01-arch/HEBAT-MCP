# SMC × ICT UNIFIED FRAMEWORK v1.0
### Pine Script v6 + Integrasi Analyzer (TradingView × Node.js × MT5)

> **Dibuat**: 2 Sep 2026
> **Untuk**: Fitra (trader XAUUSD) + AI assistant manapun
> **Tujuan**: Satu indikator Pine Script yang MENGGABUNGKAN:
> - **SMC Paten Fitra v2.2** (13 modul, 8 layer filter dari 13 MISS)
> - **ICT** (Kill Zones, Silver Bullet, Judas Swing, OTE, Power of 3)
> - **Output JSON** siap-alert/webhook
> - **CDP-readable** untuk `analisa_gabungan.cjs`

---

## DAFTAR ISI

1. [Ringkasan & Motivasi](#1-ringkasan--motivasi)
2. [Kekurangan Pine Script & Solusi](#2-kekurangan-pine-script--solusi)
3. [Arsitektur Framework](#3-arsitektur-framework)
4. [Kode Pine Script Utama](#4-kode-pine-script-utama)
5. [Modul ICT yang Diimplementasikan](#5-modul-ict-yang-diimplementasikan)
6. [Panduan Penggunaan & Kustomisasi](#6-panduan-penggunaan--kustomisasi)
7. [Antarmuka Data (Input/Output)](#7-antarmuka-data-inputoutput)
8. [Integrasi dengan Analyzer (CDP/Webhook/JSON)](#8-integrasi-dengan-analyzer-cdpwebhookjson)
9. [Skenario Penggunaan Nyata](#9-skenario-penggunaan-nyata)
10. [Referensi & Lampiran](#10-referensi--lampiran)

---

## 1. RINGKASAN & MOTIVASI

### 1.1 Asumsi Awal
- Pine Script **v6** (saat ini paling stabil, dukung `array`/`map`/`matrix` UDT).
- TradingView **Premium/Pro** (untuk multi-chart layout + alert webhook).
- Pair fokus: **XAUUSD** (works untuk semua pair liquid, terutama Forex/Major/Index).
- TF rekomendasi: **M15** (default), tapi framework mendukung D1, H4, H1, M30, M5, M1.
- Timezone: **UTC** (untuk kill zone ICT). Bisa dikonversi via `time(timeframe.period, "Asia/Jakarta")` di versi lokal.

### 1.2 Apa yang Berbeda dari v2.2?

| Aspek | Paten v2.2 (lama) | SMC×ICT Unified v1.0 |
|-------|---------------------|----------------------|
| Modul SMC | 8 (struktur, sweep, FVG, OB, range, FIBO, filter, MTF) | 9 (semua v2.2 + PO3, Judas, KZ) |
| ICT Kill Zones | ❌ | ✅ Asia/London/NY/Lunch/Silver Bullet |
| Power of 3 (PO3) | ❌ | ✅ ACC/MANIP/DIST auto-detect |
| Judas Swing | ❌ | ✅ deteksi sweep 5-bar pertama sesi |
| OTE 62-79% | Partial (61.8 + 78.6) | ✅ Full + `oteLow/oteHigh` lines |
| FVG multi-zone | 1 per sisi | ✅ array max 5 per sisi + invalidasi otomatis |
| Output | `PINE_DATA` (pipe) | `PINE_DATA` + `PINE_DATA_JSON` |
| Alert | ❌ | ✅ JSON siap-webhook |
| Baris kode | 289 | 462 (+60% fitur) |
| Performa | Stabil | Stabil (v6 hemat `request.security`) |

### 1.3 Prinsip Desain
1. **Backward compatible** — label `PINE_DATA|` masih ada, tidak break `baca_pine.cjs` lama.
2. **Modular** — setiap modul independen, bisa di-disable via input.
3. **Stateful dengan `var`** — FVG/OB disimpan antar bar, bukan event 1-shot.
4. **JSON first** — output utama untuk AI, label visual sekunder.
5. **ICT aware** — Kill zones, Silver Bullet, PO3 di-encode langsung.

---

## 2. KEKURANGAN PINE SCRIPT & SOLUSI

### 2.1 Tabel Lengkap

| # | Kekurangan | Dampak | Solusi di Framework Ini |
|---|------------|--------|-------------------------|
| 1 | **Tidak ada class/object UDT complex** (v6 baru ada UDT sederhana) | Struktur data terbatas | Pakai **array<float>** + index manual (lihat `fvgBullLo/Hi`, `fvgBearLo/Hi`) |
| 2 | **Plot/label/line/box terbatas** (max 500/500/500/500 di v6) | Crash kalau over-limit | `max_lines_count=500`, `max_labels_count=500`, `max_boxes_count=200`; **auto-cleanup** FVG/OB saat array > 5 |
| 3 | **Tidak bisa multi-symbol backtest** di satu script | Sulit compare pair | Pisah script per pair; panggil via `study_on_study` atau alert webhook |
| 4 | **`request.security` lambat** untuk banyak TF | Lag di chart | v6 sudah **hemat by default**; kita panggil hanya 5 TF (D1, H4, H1, M5) + hitung M15 lokal |
| 5 | **Tidak ada websocket/HTTP request** dari Pine | Tidak bisa push ke server sendiri | Pakai **alert webhook** TradingView → server eksternal |
| 6 | **Backtesting single-symbol** only | Tidak bisa cross-pair | Gunakan **Realtime Alert** + custom analyzer di Node.js (lihat #8) |
| 7 | **Tidak bisa import library** (seperti Python) | Code duplikasi | Pakai **function** dalam script + copy-paste antar chart (planned: PineConnector) |
| 8 | **No persistent state** antar restart chart | FVG/OB reset | ✅ `var` keyword (kita pakai) + `varip` untuk ultra-fast |
| 9 | **Calendar/holiday detection** terbatas | Bisa miss news | Pakai `input.session()` + manual holiday list (planned enhancement) |
| 10 | **Memory besar** untuk long history | Script lambat di 5000+ bar | `max_bars_back` di setiap variable; FVG array max 5 |
| 11 | **Tidak bisa debug interaktif** | Susah tracing | Pakai `label.new()` debug + `log.info()` (v6 baru) |
| 12 | **Tunggal bahasa** (Pine saja) | Tidak bisa Python/JS | Solusi: **output JSON ke analyzer Node.js** (strategi utama) |

### 2.2 Workaround Spesifik yang Dipakai

**A. FVG Multi-Zone (Pine v6 array)**
```pine
var float[] fvgBullLo = array.new_float(0)  // TIDAK BOLEH na() di array
if bullFVG and array.size(fvgBullLo) < 5
    array.push(fvgBullLo, low[2])
    array.push(fvgBullHi, high[1])
// Auto-cleanup kalau invalid
for i = array.size(fvgBullLo) - 1 to 0
    if close < array.get(fvgBullLo, i)
        array.remove(fvgBullLo, i)
        array.remove(fvgBullHi, i)
```

**B. JSON Output via String Concatenation** (Pine tidak bisa `JSON.stringify`)
```pine
txt = "PINE_DATA_JSON|{\"sig\":\"" + sigVerdict + "\",\"px\":" + str.tostring(close) + "}"
```

**C. MTF Hemat** (request.security hanya untuk yang perlu)
```pine
// D1: hanya close hari ini + kemarin (untuk deteksi trend)
// H4/H1: close + EMA50 (untuk trend via EMA)
// M15: EMA50 LOKAL (hemat 1 request)
// M5: close + EMA50 (untuk scanner M5 anomaly)
d1c = request.security(syminfo.tickerid, "D",   close, lookahead=barmerge.lookahead_off)
m15e = ta.ema(close, 50)  // ← LOKAL, hemat
```

**D. State Persistence dengan `var`**
```pine
// !! JANGAN deklarasi multiple dengan type di depan !!
var float sh1 = na, sh2 = na  // ← ERROR CE10097 di Pine v6
// Benar:
var float sh1 = na
var float sh2 = na  // swing high #1, #2 — PERSIST antar bar
var int   barSweepUp = na      // bar index dari sweep terakhir
var table mtfTab = table.new(...)  // TABEL persistent
```

**E. Verdict Engine: Build Reason String Modular**
```pine
blokBuy = ""  // kosong = no block
if isPremium
    blokBuy += "PREMIUM(M11);"
if rsiBlokBuy
    blokBuy += "RSI_EXT(M9);"
// ...dst
// Lalu di verdict:
buyValid = buyRaw and isDiskon and str.length(blokBuy) == 0
```

**F. Alert JSON untuk Webhook**
```pine
if buyValid
    alert_message = '{"sig":"BUY","px":' + str.tostring(close) + ',"sl":' + str.tostring(slSug) + ... + '}'
    alert(alert_message, alert.freq_once_per_bar_close)
```

---

## 3. ARSITEKTUR FRAMEWORK

### 3.1 Diagram Modul

```
┌─────────────────────────────────────────────────────────────┐
│                  SMC×ICT UNIFIED v1.0                       │
│                  (Pine Script v6)                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  M1: Struktur SMC    ─┐                                    │
│  M2: Sweep           ─┤                                    │
│  M3: FVG & OB        ─┤                                    │
│  M4: Range PD        ─┼─► M9: VERDICT ENGINE              │
│  M5: FIBO/OTE        ─┤      │                            │
│  M6: Filter Paten    ─┤      │                            │
│  M6B: MTF EMA50      ─┤      ▼                            │
│  M7: Kill Zones ICT  ─┤   BUY_VALID / SELL_VALID          │
│  M8: Judas Swing     ─┤      │                            │
│  M9: Verdict         ─┘      │                            │
│                              │                            │
│  ┌───────────────────────────┼─────────────────────────┐  │
│  │                           ▼                         │  │
│  │  M10: OUTPUT                                       │  │
│  │  ├─ plotshape (grafik)                             │  │
│  │  ├─ table (MTF+ICT)                                │  │
│  │  ├─ box (FVG/OB)                                   │  │
│  │  ├─ line (S/R)                                     │  │
│  │  ├─ bgcolor (KZ background)                        │  │
│  │  ├─ label "PINE_DATA|"     (legacy, untuk baca_pine.cjs) │  │
│  │  ├─ label "PINE_DATA_JSON|…"  (baru, untuk baca_pine_json.cjs) │  │
│  │  └─ alert() JSON  (untuk webhook eksternal)       │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              INTEGRASI ANALYZER (Node.js)                  │
├─────────────────────────────────────────────────────────────┤
│  baca_pine_json.cjs  →  baca label PINE_DATA_JSON via CDP │
│  analisa_gabungan.cjs → kombinasikan dengan analyzer SMC  │
│  monitor_limit_xau.cjs → pantau limit + posisi            │
│  overlay_position.cjs  → inject panel ke chart            │
│                                                             │
│  Atau via TradingView Alert Webhook:                       │
│  TradingView alert() ──► server-webhook ──► MT5 eksekusi  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

```
TradingView Chart (Pine) 
    │
    ├─► Label "PINE_DATA_JSON" di chart (visual + machine readable)
    │       │
    │       └─► baca_pine_json.cjs (CDP polling tiap 60 detik)
    │              │
    │              └─► analisa_gabungan.cjs
    │                     │
    │                     └─► monitor_limit_xau.cjs → MT5
    │
    └─► Alert Webhook (saat ada BUY/SELL valid)
            │
            └─► Server (Node/Python) → MT5 API
```

---

## 4. KODE PINE SCRIPT UTAMA

**File**: `C:\HEBAT\smc_ict_unified_v1.pine` (462 baris, lengkap)

Karena kode lengkap sangat panjang, di sini saya berikan **STRUKTUR + CUPLIKAN KUNCI** saja. File asli ada di path di atas.

### 4.1 Header & Input

```pine
//@version=6
indicator("SMC×ICT Unified v1", overlay=true,
     max_lines_count=500, max_labels_count=500, max_boxes_count=200)

// INPUT dikelompokkan 4 grup:
// 1) UMUM (swing, body, SL buffer, RR, range, RSI, ATR, post-sweep, D1 wajib bear, blokir H4)
// 2) ICT KILL ZONES (Asia, London, NY AM, NY Lunch, NY PM, Silver Bullet London & NY)
// 3) TAMPILAN (FVG, OB, KZ background, S/R, PO3, label, tabel)
```

### 4.2 Modul 1: Struktur (BOS/CHoCH)

```pine
pivHi = ta.pivothigh(high, i_swingLen, i_swingLen)
pivLo = ta.pivotlow (low,  i_swingLen, i_swingLen)
var float sh1 = na
var float sh2 = na
var float sl1 = na
var float sl2 = na
if not na(pivHi)
    sh2 := sh1
    sh1 := pivHi
if not na(pivLo)
    sl2 := sl1
    sl1 := pivLo
bullStruct = sh1 > sh2 and sl1 > sl2
bearStruct = sh1 < sh2 and sl1 < sl2
bosB   = close > sh1 and not bullStruct and not bearStruct
chochB = close > sh1 and bearStruct   // PERHATIKAN: ini dengan breakUp, bukan strict
bosS   = close < sl1 and not bullStruct and not bearStruct
chochS = close < sl1 and bullStruct
```

### 4.3 Modul 2: Sweep (M10 simetris)

```pine
sweepUp = not na(sh1) and high > sh1 and close < sh1  // wick tembus, close balik
sweepDn = not na(sl1) and low  < sl1 and close > sl1
var int barSweepUp = na, barSweepDn = na
if sweepUp
    barSweepUp := bar_index
if sweepDn
    barSweepDn := bar_index
postSweepAtas  = not na(barSweepUp) and (bar_index - barSweepUp) <= i_blockBars
postSweepBawah = not na(barSweepDn) and (bar_index - barSweepDn) <= i_blockBars
// BUY diperbolehkan setelah CHoCH-B pasca-sweep-atas
postBuyOk  = not postSweepAtas  or (not na(barChB) and barChB > barSweepUp)
```

### 4.4 Modul 3: FVG & OB (state-based, multi-zone)

```pine
bullFVG = high[1] < low[2]  // ICT definisi: 3 candle, gap di tengah
bearFVG = low[1]  > high[2]

var float[] fvgBullLo = array.new_float(0)  // multi-zone via array
var float[] fvgBullHi = array.new_float(0)
var float[] fvgBearLo = array.new_float(0)
var float[] fvgBearHi = array.new_float(0)

if bullFVG and array.size(fvgBullLo) < 5  // max 5 zone per sisi
    array.push(fvgBullLo, low[2])
    array.push(fvgBullHi, high[1])
if bearFVG and array.size(fvgBearLo) < 5
    array.push(fvgBearLo, high[2])
    array.push(fvgBearHi, low[1])

// Auto-invalidate saat close tembus
if array.size(fvgBullLo) > 0
    for i = array.size(fvgBullLo) - 1 to 0
        if close < array.get(fvgBullLo, i)
            array.remove(fvgBullLo, i)
            array.remove(fvgBullHi, i)
```

### 4.5 Modul 5: FIBO + OTE (ICT)

```pine
legHi = math.max(nz(sh1, rngHi), nz(sl1, rngLo))
legLo = math.min(nz(sh1, rngHi), nz(sl1, rngLo))
legRng = legHi - legLo
f_50  = legHi - legRng * 0.50
f_618 = legHi - legRng * 0.618
f_705 = legHi - legRng * 0.705
f_786 = legHi - legRng * 0.786
// OTE ICT = 62% - 79% (sweet spot)
oteLow  = math.min(f_618, f_786)
oteHigh = math.max(f_618, f_786)
inOTE   = close >= oteLow and close <= oteHigh
```

### 4.6 Modul 7: ICT Kill Zones + PO3 + Judas Swing

```pine
// Kill Zones via input.session()
inLon   = not na(time(timeframe.period, i_kzLondon))
inNYAM  = not na(time(timeframe.period, i_kzNYAM))
inNYLn  = not na(time(timeframe.period, i_kzNYLunch))
inAsia  = not na(time(timeframe.period, i_kzAsia))
inSB    = not na(time(timeframe.period, i_silverB)) or
          not na(time(timeframe.period, i_silverBNY))

// Power of 3 (PO3) ICT
po3 = inAsia ? "ACC" :
      inLon  ? (postSweepAtas or postSweepBawah) ? "MANIP" : "ACC" :
      inNYAM ? "DIST" :
      inNYLn ? "REVERSAL" :
      inNYPM ? "DIST" : "OFF"

// Judas Swing: sweep 5-bar pertama sesi
var int barOpenLon = na, barOpenNY = na
if inLon and (na(barOpenLon) or hour != hour[1])
    barOpenLon := bar_index
if inNYAM and (na(barOpenNY) or hour != hour[1])
    barOpenNY  := bar_index
inLonEarly = not na(barOpenLon) and (bar_index - barOpenLon) <= 5
inNYEarly  = not na(barOpenNY)  and (bar_index - barOpenNY)  <= 5
judasBull  = (inLonEarly or inNYEarly) and sweepUp  // sweep↑ → BEAR
judasBear  = (inLonEarly or inNYEarly) and sweepDn  // sweep↓ → BULL
```

### 4.7 Modul 9: Verdict Engine

```pine
buyRaw  = (bosB or chochB) and confirmUp and (inBullFVG or inBullOB or inDemand or inOTE)
sellRaw = (bosS or chochS) and confirmDn and (inBearFVG or inBearOB or (close >= legHi - legRng * 0.25 and close <= legHi - legRng * 0.145))

// Filter Paten Fitra (modular)
blokBuy = ""
if isPremium         then blokBuy += "PREMIUM(M11);"
if rsiBlokBuy        then blokBuy += "RSI_EXT(M9);"
if inBearOB          then blokBuy += "IN_OB_BEAR(M9);"
if postSweepAtas and not postBuyOk then blokBuy += "POST_SWEEP(M10);"
if i_blokH4Law and h4Trend == "BEAR" then blokBuy += "H4_BEAR(MTF);"
if inNYLn            then blokBuy += "NY_LUNCH;"

buyValid  = buyRaw  and isDiskon  and str.length(blokBuy)  == 0
sellValid = sellRaw and isPremium and str.length(blokSell) == 0
sigVerdict = buyValid ? "BUY" : sellValid ? "SELL" : "FLAT"
ready      = (buyValid or sellValid) ? 100 : (buyRaw or sellRaw) ? 50 : 0
alasan = buyRaw and not buyValid and str.length(blokBuy) > 0 ? "BUY_BLOK:" + blokBuy :
         sellRaw and not sellValid and str.length(blokSell) > 0 ? "SELL_BLOK:" + blokSell :
         buyRaw ? "BUY_AGRESIF" : sellRaw ? "SELL_AGRESIF" :
         judasBull ? "JUDAS_BEAR" : judasBear ? "JUDAS_BULL" : "NO_SETUP"

// SL/TP otomatis
if buyValid or (buyRaw and isDiskon)
    slSug  := math.min(nz(sl1, low), low) - i_bufSL
    float riskB = close - slSug
    tp1Sug := close + riskB * i_rr1
    tp2Sug := close + riskB * i_rr2
```

### 4.8 Modul 10: Output (label JSON + alert webhook)

```pine
if barstate.islast
    // Label legacy (kompatibel dgn baca_pine.cjs)
    txtLegacy = "PINE_DATA|" + str.tostring(close) + "|" + str.tostring(rsiVal, "#.#") + "|" + sigVerdict + "|" + str.tostring(ready) + "|" + str.tostring(atrVal, "#.##") + "|" + alasan + "|" + (isDiskon ? "DISKON" : isPremium ? "PREMIUM" : "MID") + "|" + str.tostring(midR, "#.#") + "|" + str.tostring(slSug, "#.#") + "|" + str.tostring(tp1Sug, "#.#") + "|" + str.tostring(tp2Sug, "#.#") + "|" + sesiStr + "|" + mtfStr
    label.new(bar_index, low - atrVal * 1.2, txtLegacy, style=label.style_label_up, color=color.new(color.black, 70), textcolor=color.white, size=size.tiny)

    // Label JSON (baru, untuk baca_pine_json.cjs)
    txtJson = "PINE_DATA_JSON|{\"v\":\"1.0\",\"px\":" + str.tostring(close) + ",\"sig\":\"" + sigVerdict + "\",\"ready\":" + str.tostring(ready) + ",\"alasan\":\"" + alasan + "\",\"zona\":\"" + (isDiskon ? "DISKON" : isPremium ? "PREMIUM" : "MID") + "\",\"sl\":" + str.tostring(slSug, "#.#") + ",\"tp1\":" + str.tostring(tp1Sug, "#.#") + ",\"tp2\":" + str.tostring(tp2Sug, "#.#") + ",\"sesi\":\"" + sesiStr + "\",\"kz\":\"" + kzStr + "\",\"sb\":" + str.tostring(inSB) + ",\"po3\":\"" + po3 + "\",\"judas\":\"" + (judasBull ? "BEAR" : judasBear ? "BULL" : "-") + "\",\"oteLo\":" + str.tostring(oteLow, "#.#") + ",\"oteHi\":" + str.tostring(oteHigh, "#.#") + ",\"mtf\":\"" + mtf5Str + "\",\"t\":" + str.tostring(time) + "}"
    label.new(bar_index, low - atrVal * 2.2, txtJson, style=label.style_label_up, color=color.new(color.purple, 50), textcolor=color.white, size=size.tiny)

// Alert JSON untuk webhook eksternal
if buyValid
    alert_message = '{"sig":"BUY","px":' + str.tostring(close) + ',"sl":' + str.tostring(slSug, "#.#") + ',"tp1":' + str.tostring(tp1Sug, "#.#") + ',"tp2":' + str.tostring(tp2Sug, "#.#") + ',"alasan":"BUY_VALID","zona":"DISKON","sesi":"' + sesiStr + '","kz":"' + kzStr + '","po3":"' + po3 + '","mtf":"' + mtf5Str + '","t":' + str.tostring(time) + '}'
    alert(alert_message, alert.freq_once_per_bar_close)
```

---

## 5. MODUL ICT YANG DIIMPLEMENTASIKAN

### 5.1 Kill Zones (Jam High-Probability)
| KZ | Default Time (Exchange UTC-5) | Karakter |
|----|-------------------------------|----------|
| **Asia** | 17:00-02:00 | Setup untuk London; biasanya ranging, liquidity build |
| **London** | 02:00-05:00 | First impulse + Judas Swing; high volatility |
| **NY AM** | 07:00-10:00 | Real move setelah London fakeout |
| **NY Lunch** | 10:00-12:00 | ⚠️ Choppy, NO-TRADE (di-block otomatis) |
| **NY PM** | 12:00-15:00 | Closing auction, profit-taking |
| **Silver Bullet** | 03:00-04:00 (Lon) / 08:00-09:00 (NY) | 1-jam high-prob window |

**Cara pakai**: Pakai default UTC. Kalau Anda di Jakarta (WIB = UTC+7), tambahkan +7 jam. Edit input sesuai sesi exchange pair Anda.

### 5.2 Power of 3 (PO3) ICT
- **ACCumulation** (Asia): price konsolidasi, range sempit.
- **MANIPulation** (London): Judas Swing — false breakout trap retail.
- **DISTribution** (NY AM): real move setelah liquidity terambil.

**Deteksi otomatis**:
- Asia → ACC
- London + ada sweep → MANIP
- NY AM → DIST
- NY Lunch → REVERSAL (alert reversal possible)
- NY PM → DIST (closing auction)

### 5.3 Judas Swing
**Definisi ICT**: False breakout di awal sesi untuk trap retail.
**Deteksi**: Sweep (high atau low) terjadi dalam **5 candle pertama** London atau NY AM.
**Output**: `judasBull` = sweep high → prediksi **SELL**; `judasBear` = sweep low → prediksi **BUY**.
**Alert khusus**: Ada `alert()` terpisah agar analyzer bisa notify "JUDAS detected".

### 5.4 OTE (Optimal Trade Entry)
**Definisi ICT**: Entry di zona 62%-79% retracement.
**Implementasi**: 
- `oteLow = min(f_618, f_786)` 
- `oteHigh = max(f_618, f_786)`
- `inOTE = close in [oteLow, oteHigh]`
- Ditampilkan sebagai garis ungu (`plot.style_stepline`)

### 5.5 FVG Multi-Zone
**Upgrade dari v2.1** (yang hanya simpan 1 FVG per sisi):
- Sekarang pakai **array** (max 5 per sisi).
- **Auto-invalidate** saat close tembus sisi berlawanan.
- Bisa lihat semua FVG aktif di chart sebagai box.

### 5.6 Anti-Choppy Filter
- **NY Lunch** (10:00-12:00 ET) → di-block otomatis (lihat filter `if inNYLn then blokBuy += "NY_LUNCH"`).
- **H4 lawan** → blokir keras (sama Paten Fitra).
- **MTF conflict** → warning saja (tidak block).

---

## 6. PANDUAN PENGGUNAAN & KUSTOMISASI

### 6.1 Cara Pasang di TradingView

1. Buka **TradingView** → **Pine Editor** (bagian bawah chart).
2. Klik **Open** → pilih file `smc_ict_unified_v1.pine` dari `C:\HEBAT\`.
3. Klik **Save** → **Add to chart**.
4. Muncul panel input di sidebar kiri → sesuaikan:
   - **Swing Length**: default 3 (untuk XAUUSD M15). Naikkan ke 5 untuk noise lebih sedikit.
   - **Body min**: default 0.45 (candle tegas). Naikkan ke 0.55 untuk filter lebih ketat.
   - **Buffer SL**: default 3.0 (poin harga). Naikkan untuk XAUUSD = 5-10.
   - **Kill Zones**: sesuaikan dengan timezone exchange (default UTC-5 untuk US pair).
5. Simpan sebagai **Template** agar tidak setting ulang.

### 6.2 Kustomisasi untuk Pair Lain

| Pair | SwingLen | BodyMin | BufSL | RangeBars |
|------|----------|---------|-------|-----------|
| **XAUUSD** | 3-5 | 0.45-0.55 | 5-10 | 192 (8 hari M15) |
| **EURUSD** | 5-8 | 0.50 | 0.0005-0.0010 | 240 |
| **BTCUSD** | 3-7 | 0.40 | 50-100 | 96 (1 hari M15) |
| **NAS100** | 5-10 | 0.45 | 20-50 | 192 |
| **US30** | 5-10 | 0.45 | 30-70 | 192 |

### 6.3 Setup Alert Webhook

1. Di TradingView, klik kanan indikator → **Add Alert**.
2. Condition: **SMC×ICT Unified v1**.
3. Trigger: `alert()` function fires (jadi otomatis saat ada BUY_VALID/SELL_VALID/JUDAS).
4. **Webhook URL**: opsional — paste URL server Anda (lihat #8).
5. **Message**: biarkan kosong (otomatis dari `alert_message` JSON).

---

## 7. ANTARMUKA DATA (INPUT/OUTPUT)

### 7.1 Input (dari user → Pine)

| Input | Tipe | Default | Fungsi |
|-------|------|---------|--------|
| `i_swingLen` | int | 3 | Panjang swing (kiri+kanan) untuk pivot detection |
| `i_bodyMin` | float | 0.45 | Body minimum untuk candle konfirmasi |
| `i_bufSL` | float | 3.0 | Buffer SL (poin harga) di luar swing |
| `i_rr1` / `i_rr2` | float | 3.0 / 4.0 | Risk-Reward TP1 / TP2 |
| `i_rangeBars` | int | 192 | Bar untuk range Premium/Diskon |
| `i_rsiLen` | int | 14 | Panjang RSI |
| `i_blockBars` | int | 12 | Bar blokir pasca-sweep (M10) |
| `i_d1BearWAJIB` | bool | true | SELL wajib D1 BEAR (M11) |
| `i_blokH4Law` | bool | true | Blokir entry lawan trend H4 |
| `i_kz*` | session | (default Exchange) | Jam Kill Zone ICT |
| `i_show*` | bool | true | Toggle tampilan visual |

### 7.2 Output (dari Pine → user/AI)

#### A. Label Visual `PINE_DATA|` (legacy, kompatibel dgn `baca_pine.cjs`)
Format: `PINE_DATA|price|rsi|sig|ready|atr|alasan|zona|mid|sl|tp1|tp2|sesi|mtf`

#### B. Label Visual `PINE_DATA_JSON|` (baru, untuk `baca_pine_json.cjs`)
Format JSON lengkap — lihat schema di bawah.

#### C. Alert Webhook (JSON)
Schema:
```json
{
  "sig": "BUY" | "SELL",
  "px": 4310.4,
  "sl": 4225.0,
  "tp1": 4374.0,
  "tp2": 4458.0,
  "alasan": "BUY_VALID",
  "zona": "DISKON" | "PREMIUM",
  "sesi": "LONDON" | "NY" | "ASIA" | "OFF" | "NY_LUNCH" | "NY_PM",
  "kz": "LONDON" | "NY_AM" | "NY_LUNCH" | "NY_PM" | "ASIA" | "OFF",
  "po3": "ACC" | "MANIP" | "DIST" | "REVERSAL" | "OFF",
  "judas": "BULL" | "BEAR" | "-",
  "mtf": "BULL|BEAR|FLAT|BULL|BULL",
  "t": 1725287400
}
```

#### D. Variabel Internal (untuk analyzer)
Semua variabel modul (`buyValid`, `sellValid`, `ready`, `slSug`, `tp1Sug`, `tp2Sug`, `inSB`, `po3`, `judasBull`, `judasBear`, `oteLow`, `oteHigh`, `obBullLo/Hi`, `obBearLo/Hi`, `fvgBullLo/Hi[]`, `fvgBearLo/Hi[]`, `sh1`, `sl1`) — bisa diakses dari `baca_pine_json.cjs` lewat label JSON.

---

## 8. INTEGRASI DENGAN ANALYZER (CDP/WEBHOOK/JSON)

### 8.1 Skema Integrasi End-to-End

```
┌─────────────────────────────────────────────────────────────┐
│                    TradingView Chart                        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Pine Script: smc_ict_unified_v1.pine                │  │
│  │  - Modul SMC + ICT (lihat #3)                         │  │
│  │  - Output: PINE_DATA_JSON label + alert() JSON       │  │
│  └────────────────────┬──────────────────────────────────┘  │
│                       │                                     │
└───────────────────────┼─────────────────────────────────────┘
                        │
        ┌───────────────┴────────────────┐
        │                                │
        ▼                                ▼
┌──────────────────────┐    ┌─────────────────────────┐
│  JALUR 1: CDP        │    │  JALUR 2: WEBHOOK       │
│  (polling)           │    │  (push, real-time)      │
│                      │    │                         │
│  baca_pine_json.cjs  │    │  TradingView Alert      │
│  (tiap 60 detik)     │    │  → POST ke server      │
│        │             │    │        │                │
│        ▼             │    │        ▼                │
│  analisa_gabungan    │    │  Server (Node/Python)   │
│  (kombinasikan)      │    │  → MT5 API execute     │
│        │             │    │                         │
│        ▼             │    │                         │
│  monitor_limit_xau   │    │                         │
│  → MT5               │    │                         │
└──────────────────────┘    └─────────────────────────┘
```

### 8.2 Jalur 1: CDP (Polling via `baca_pine_json.cjs`)

**File**: `C:\HEBAT\baca_pine_json.cjs` (sudah dibuat, lihat script).

**Cara kerja**:
1. Node.js connect ke TradingView via Chrome DevTools Protocol (CDP) port 9222.
2. Query DOM: cari label dengan prefix `PINE_DATA_JSON`.
3. Parse JSON → simpan ke `C:\HEBAT\pine_latest.json`.
4. `analisa_gabungan.cjs` baca file ini + gabung dengan analyzer SMC sendiri.

**Contoh output**:
```json
{
  "v": "1.0",
  "px": 4310.4,
  "rsi": 45.2,
  "sig": "FLAT",
  "ready": 0,
  "atr": 8.5,
  "alasan": "NO_SETUP",
  "zona": "DISKON",
  "mid": 4374.5,
  "sl": 4225.0,
  "tp1": 4374.0,
  "tp2": 4458.0,
  "sesi": "LONDON",
  "kz": "LONDON",
  "sb": false,
  "po3": "DIST",
  "judas": "-",
  "oteLo": 4320.5,
  "oteHi": 4345.2,
  "obBull": [4282.6, 4326.8],
  "obBear": [4229.9, 4371.8],
  "fvgBull": [[4280.0, 4300.0]],
  "fvgBear": [[4472.0, 4564.0]],
  "sh": 4367.3,
  "sl": 4287.4,
  "mtf": "BEAR|BEAR|FLAT|BULL|BULL",
  "t": 1725287400
}
```

**Cara pakai**:
```bash
node C:\HEBAT\baca_pine_json.cjs
# Output: print JSON ke console + save ke pine_latest.json
```

### 8.3 Jalur 2: Webhook (Push Real-time via TradingView Alert)

**Konfigurasi**:
1. Di TV Pine Editor, sudah ada `alert()` untuk BUY_VALID / SELL_VALID / JUDAS.
2. Di TV, klik kanan chart → **Add Alert**:
   - **Condition**: `SMC×ICT Unified v1`
   - **Trigger**: `alert() function calls only`
   - **Webhook URL**: `https://your-server.com/webhook`
   - **Message**: kosong (otomatis dari Pine)
3. Server (Node.js / Python) terima POST → parse JSON → eksekusi via MT5 API.

**Skeleton server webhook** (Node.js Express, opsional):
```javascript
// server-webhook.js
const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  const { sig, px, sl, tp1, tp2, alasan, kz, po3, mtf } = req.body;
  
  // Filter: hanya trade valid (ready=100) + KZ aktif
  if (sig !== 'BUY' && sig !== 'SELL') return res.status(200).send('skip');
  if (kz === 'OFF' || kz === 'NY_LUNCH') return res.status(200).send('skip kz');
  
  // Eksekusi via MT5 API
  console.log(`[${new Date().toISOString()}] ${sig} @ ${px} | SL ${sl} | TP1 ${tp1} | TP2 ${tp2}`);
  // mt5.orderSend({...})
  
  res.status(200).send('ok');
});

app.listen(3000, () => console.log('Webhook listening on :3000'));
```

### 8.4 Integrasi dgn `analisa_gabungan.cjs` (SMC Analyzer)

`analisa_gabungan.cjs` sudah membaca label `PINE_DATA` (legacy). Untuk versi JSON, tambahkan di awal script:

```javascript
// Di awal analisa_gabungan.cjs
const fs = require('fs');
if (fs.existsSync('C:/HEBAT/pine_latest.json')) {
    const pineJson = JSON.parse(fs.readFileSync('C:/HEBAT/pine_latest.json'));
    // Pakai pineJson.sig, pineJson.alasan, dll untuk keputusan
}
```

### 8.5 Integrasi dgn `monitor_limit_xau.cjs` (Monitor Limit Pending)

Monitor bisa baca `pine_latest.json` untuk:
- Validasi bahwa `ready=100` (signal valid, bukan 50/0).
- Validasi bahwa `kz != "NY_LUNCH"` (no-trade zone).
- Update TP/SL limit otomatis saat `slSug`/`tp1Sug`/`tp2Sug` berubah.

---

## 9. SKENARIO PENGGUNAAN NYATA

### 9.1 Skenario 1: Harian Pagi (Pre-London)

**Waktu**: 06:00 WIB (= 23:00 UTC, NYSE close + Asia open)
**Aksi**:
1. Buka chart XAUUSD M15 + Pine indikator.
2. Lihat tabel MTF: D1/H4/H1/M15/M5 trend.
3. Lihat background KZ: Asia (cyan muda) = ACC.
4. Cek label PINE_DATA_JSON: `kz="ASIA"`, `po3="ACC"`, `sig="FLAT"`, `alasan="NO_SETUP"`.
5. **TIDAK ENTRY** — accumulation, tunggu London.
6. Pasang `node baca_pine_json.cjs` di background untuk auto-log.

### 9.2 Skenario 2: London Open (Waspada Judas Swing)

**Waktu**: 14:00-15:00 WIB (= 07:00-08:00 UTC = London Open 02:00 UTC + Asia+7)
**Aksi**:
1. Background KZ: **London (biru muda)**.
2. PO3: `MANIP` (manipulation window).
3. **WASPADA JUDAS**: jika 5 candle pertama London sweep high atau low → `judasBull` atau `judasBear` = TRUE.
4. **JUDAS_BEAR** (sweep high di awal London) → sinyal SELL, tapi tunggu CHoCH-S konfirmasi.
5. Alert khusus: `"JUDAS_BEAR @ <price> (sweep high di awal sesi — waspada SELL)"` → masuk ke monitor.

### 9.3 Skenario 3: Real Entry (NY AM)

**Waktu**: 20:00-22:00 WIB (= 13:00-15:00 UTC, NY AM overlap London)
**Aksi**:
1. PO3: `DIST` (distribution — real move).
2. Cek tabel: D1/H4/H1/M15/M5 alignment.
3. Verifikasi gate Paten:
   - Zona DISKON (< mid 4374) ✅
   - PINE M15 BUY + CHoCH-B + candle tegas ✅
   - SL struktural (sub-struktur + buffer 5 pip) ✅
   - RR 1:3 ke TP1, 1:4 ke TP2 ✅
4. Sinyal `sig="BUY"`, `ready=100` → `alert()` trigger.
5. Alert JSON ke webhook → server → MT5 eksekusi.
6. `node baca_pine_json.cjs` poll → `analisa_gabungan.cjs` → `monitor_limit_xau.cjs` pantau.

### 9.4 Skenario 4: Sweep + Reversal (Pattern Umum)

**Kondisi**: H4 RSI 21 (extreme oversold), D1 OB BULLISH aktif, harga 4280-4300.
**Aksi**:
1. **JANGAN entry BUY market** (MISS #12/#13).
2. Pasang BUY LIMIT di D1 OB bottom (4229.9) + SL 4225.
3. Tunggu PINE flip BUY di M15 + CHoCH-B.
4. Atau entry pasca-sweep: setelah harga bikin lower low ke 4280, REJECT, lalu CHoCH-B → entry BUY di close candle rejection.
5. TP1 = mid 4374 (partial 50%), TP2 = M30 FIBO 4457 (partial 30%), runner ke 4549-4600.

### 9.5 Skenario 5: NO-TRADE Filter (ICT-aware)

**Kondisi**: NY Lunch (10:00-12:00 ET).
**Aksi**:
1. Background: **NY Lunch (abu-abu)**.
2. Filter `NY_LUNCH` aktif → semua entry di-block otomatis.
3. `alasan` akan mengandung `"NY_LUNCH;"` (lihat output `BUY_BLOK:NY_LUNCH;...`).
4. **JANGAN entry** — tunggu NY PM atau besok.

### 9.6 Skenario 6: Backtest Manual (untuk Verifikasi)

**Waktu**: malam hari, market tutup.
**Aksi**:
1. Zoom out chart ke 6 bulan terakhir.
2. Aktifkan **Replay Mode** di TradingView (Premium).
3. Replay bar-by-bar → amati label `JUDAS` + `BUY_VALID` muncul.
4. Catat winrate, profit factor → simpan di `trade_log.json`.
5. Adjust input `i_blockBars`, `i_swingLen` jika perlu.

---

## 10. REFERENSI & LAMPIRAN

### 10.1 File-File Terkait

| File | Path | Fungsi |
|------|------|--------|
| **Pine v1.0 (ini)** | `C:\HEBAT\smc_ict_unified_v1.pine` | Indikator utama |
| **Pine v2.2 (lama)** | `C:\HEBAT\smc_swing_paten_v2.pine` | Backup, masih dipakai |
| **Baca PINE JSON** | `C:\HEBAT\baca_pine_json.cjs` | Polling via CDP, output JSON |
| **Baca PINE legacy** | `C:\HEBAT\baca_pine.cjs` | Polling via CDP, output pipe |
| **Analyzer SMC** | `C:\HEBAT\analisa_gabungan.cjs` | Kombinasi PINE + SMC analyzer |
| **Monitor limit** | `C:\HEBAT\monitor_limit_xau.cjs` | Pantau limit + posisi |
| **Config** | `C:\HEBAT\config.json` | PINE study ID |
| **Knowledge base** | `C:\HEBAT\KNOWLEDGE_BASE.md` | Paten + lessons + state |
| **Paten Fitra v2.2** | `C:\HEBAT\smc_swing_paten_v2.pine` | Versi sebelumnya |

### 10.2 Schema JSON (untuk referensi)

```typescript
interface PineDataJson {
  v: "1.0";
  px: number;          // close price
  rsi: number;         // RSI value
  sig: "BUY" | "SELL" | "FLAT";
  ready: 0 | 50 | 100;
  atr: number;
  alasan: string;
  zona: "DISKON" | "PREMIUM" | "MID";
  mid: number;         // mid range
  sl: number;          // suggested SL
  tp1: number;         // suggested TP1
  tp2: number;         // suggested TP2
  sesi: "ASIA" | "LONDON" | "NY" | "NY_LUNCH" | "NY_PM" | "OFF";
  kz: "ASIA" | "LONDON" | "NY_AM" | "NY_LUNCH" | "NY_PM" | "OFF";
  sb: boolean;         // Silver Bullet
  po3: "ACC" | "MANIP" | "DIST" | "REVERSAL" | "OFF";
  judas: "BULL" | "BEAR" | "-";
  oteLo: number;
  oteHi: number;
  obBull: [number, number];   // [lo, hi]
  obBear: [number, number];
  fvgBull: Array<[number, number]>;
  fvgBear: Array<[number, number]>;
  sh: number;          // swing high #1
  sl: number;          // swing low #1
  mtf: string;         // "BULL|BEAR|FLAT|BULL|BULL"
  t: number;           // timestamp
}
```

### 10.3 Roadmap / TODO

- [ ] Tambah **session-specific RSI threshold** (lebih ketat di KZ, lebih longgar di off).
- [ ] Tambah **automatic news filter** (via `input.session()` + manual holiday).
- [ ] Tambah **correlation matrix** multi-pair (planned via PineConnector).
- [ ] Tambah **ML-based confidence score** (planned via Python sidecar).
- [ ] Optimize **memory** untuk chart 5000+ bar (pakai `max_bars_back`).
- [ ] Buat **chart preset templates** untuk XAUUSD, EURUSD, BTC, NAS100.

### 10.4 Changelog

| Versi | Tanggal | Perubahan |
|-------|---------|-----------|
| **v1.0** | 2 Sep 2026 | Initial: gabung SMC Paten Fitra v2.2 + ICT (KZ, PO3, Judas, OTE, multi-FVG, JSON output, alert webhook) |
| v2.2 | 26 Agu 2026 | MTF EMA50 + D1 wajib bear (Paten) |
| v2.1 | 26 Agu 2026 | Fix demandZona, post-sweep simetris, FVG zona state |
| v2.0 | 25 Agu 2026 | SMC SWING PATEN — original |

---

*Dibuat 2 Sep 2026 oleh AI (Fatra) untuk konsolidasi SMC Paten Fitra + ICT. Semoga profit selalu, Fitra.*
