# KNOWLEDGE BASE — SISTEM TRADING FITRA (XAUUSD)

> **Dokumen ini = SINGLE SOURCE OF TRUTH** untuk AI mana pun yang meneruskan kerja Fitra.
> **Cara baca**: [0-1] konteks+paten → [2-3] file+commands → [3.5] MTF → [4] lesson index → [5-6] metodologi → [7-9] jebakan+state → [10-11] gaya kerja.
> Update: 2 Sep 2026 — dibuat oleh AI (Fatra) untuk konsolidasi AGENTS.md + pelajaran_sl.md + state live.

---

## 0. KONTEKS USER (WAJIB BACA)

- **Fitra** — trader XAUUSD (OANDA) di **akun cent MT5**.
- **AI asisten**: "Fatra" (bahasa Indonesia santai, tapi **DISIPLIN KERAS** soal aturan).
- **Saldo**: 2.000 USC (top-up 25 Aug 2026). Target: migrasi ke akun standar saat $70-80.
- **Misi**: konsisten ikut aturan paten → profit konsisten → migrasi.
- **Bahasa**: Indonesia. Gaya: langsung, to the point, tidak basa-basi.

---

## 1. ATURAN PATEN (THE CORE — TIDAK BOLEH DILANGGAR)

### 1.1 Zona
- **BUY hanya di DISKON** (harga < mid range H4/H1). (MISS #11, #13)
- **SELL hanya jika D1 BEARISH** + harga PREMIUM (di atas mid). (MISS #6, #11)
- **DISKON DALAM** (50-61.8% FIBO ∩ OB/FVG) > DISKON pinggir mid.

### 1.2 Konfirmasi (WAJIB)
- **PINE M15 searah** + **CHoCH-B/S searah** + **candle tegas** (body ≥0.45).
- Tanpa itu = **AGRESIF** → masuk kategori MISS (lihat #12, #13).
- RSI ekstrem **BUKAN** sinyal reversal (lihat Aturan RSI bawah).

### 1.3 SL Struktural
- **Swing**: di BAWAH/ATAS sweep/swing + buffer 5-10 pip. **JANGAN** tepat di tepi obvious (= magnet hunt, MISS #7/#8).
- **Scalp**: 10 pip (hanya untuk entry di tengah zona kuat).
- SL harus di **sub-struktur** (MISS #12 contoh benar: SL 32 pip di bawah sweep low).

### 1.4 RR & Manajemen
- **TP1 = 1:3** (mesin profit utama). **TP2 = 1:4**.
- **FIBO EXT 127.2%** = bonus runner saja, jangan ditahan paksa. Probabilitas kena hanya 30-40%.
- **Jatah harian: 3 entry**. **2 loss = STOP TOTAL** hari itu (anti balas dendam, MISS #13).

### 1.5 Layer ≠ Jatah (Pilihan B — cara Fitra sebenarnya)
- 1 entry = 2 layer @0.05 lot. L1 tutup di TP1 (1:3), L2 runner ke TP2 (1:4).
- Setelah TP1 kena → **geser SL L2 ke BE** (atau trailing 1R).

### 1.6 Protokol Eksekusi Standar (revisi 26 Agu)
- **SEMUA entry = LIMIT ORDER swing** (taruh di zona → tunggu terisi → kelola).
- **Setup zona dekat** (range low/mid): 2 layer @0.05 → L1 TP1, L2 TP2.
- **Setup SWING JAUH** (FIBO EXT/zona diskon dalam): 1 layer @0.01-0.05 → target EXT/trailing.
- **SL struktural** (bukan 10 pip kaku). Hasil akhir hanya 2: TP kena atau SL kena.

### 1.7 Profit Protection
- **Floating ≥ 1.5R** → **geser SL ke BE + partial close 50%** (pelajaran 25-26 Agu).
- Jangan biarkan profit balik jadi loss.
- **Limit lama** yang price-nya sudah 100+ pip dari harga sekarang = **HAPUS**, jangan ditinggali.

### 1.8 Aturan RSI (dari MISS #6/#7)
- RSI overbought/oversold **BUKAN** sinyal pembalikan.
- Di trend kuat, RSI bertahan 80+ berhari-hari = kekuatan, bukan kejenuhan.
- Reversal butuh minimal 2 dari 3: **DIVERGENCE + CHoCH + candle rejection tegas**.
- RSI ekstrem + semua TF searah = **momentum grab** (tunggu grab selesai).
- PINE FLAT di RSI ekstrem = sistem benar, **JANGAN paksakan entry**.

### 1.9 Sesi (jam WIB)
- Asian 05:00-14:00 (vol rendah-menengah)
- London 14:00-20:00 (tinggi)
- NY 20:00-05:00 (tinggi)
- **Overlap London+NY 20:00-23:00** (tertinggi) → setup besar lebih valid.

---

## 2. ARSITEKTUR FILE

### 2.1 File Inti (Pipeline — jangan diubah sembarangan)

| File | Fungsi | Trigger | Output |
|------|--------|---------|--------|
| `hi_fitra.cjs` | STARTUP all-in-one: TV on → health check → overlay → scan → monitor | "hi fitra" | TV ready + monitor jalan |
| `analisa_gabungan.cjs` | Scan penuh: PINE v2 + SMC analyzer + RSI + FIBO + sweep + verdict | scan pasar | verdict NO ENTRY/PULLBACK/SETUP |
| `baca_pine.cjs` | Baca label `PINE_DATA` dari chart (TF aktif) | kapan saja | 1 baris PINE_DATA |
| `scan_all_tf.cjs` | Scan PINE semua TF: D1/H4/H1/M30/M15/M5 (cycle + baca) | monitoring detail | tabel 6 TF |
| `cycle_tf.cjs` | Cycle timeframe D→240→60→30→15→5→15 (warm-up PINE) | setelah restart TV | PINE populated di semua TF |
| `overlay_position.cjs` | Inject panel HTML ke chart TV via CDP :9222 (data-driven dari JSON) | setelah edit JSON | panel muncul di chart |
| `monitor_limit_xau.cjs` | Pantau limit pending + posisi aktif tiap 60 dtk (ada FILTER GLITCH) | otomatis via auto_start_watch | log → `monitor_limit_xau.log` |
| `auto_start_watch.cjs` | Watcher background: TV menyala → overlay + scan + monitor (dengan lock) | background | monitor PID di `monitor.lock` |
| `verify_overlay_dom.cjs` | Cek panel overlay muncul di DOM TV | debug | YES/NO |
| `read_m5.cjs` | Baca OHLCV M5 untuk analisis candle detail | eksperimen | list candle M5 |

### 2.2 File Data (SUMBER KEBENARAN — edit ini, JANGAN hardcode di skrip)

| File | Isi | Catatan penting |
|------|-----|----------------|
| `config.json` | `pineStudyId: "ppv22M"` | ID PINE v2 di TV |
| `overlay_plan.json` | Plan limit aktif + syarat + double-plan rule | title mengandung BUY/SELL untuk deteksi |
| `posisi.json` | Posisi live + `active`/`entry`/`sl`/`tp1`/`tp2`/`title` | title WAJIB mengandung BUY/SELL |
| `entry_hari.json` | Jatah harian: `tanggal`, `entry_ke`, `sisa_jatah`, `loss_count` | Reset manual saat tanggal ganti |
| `pelajaran_sl.md` | SEMUA MISS #1-#13 | **AI baru WAJIB BACA** |
| `monitor.lock` | PID monitor aktif (anti duplikasi) | dicek sebelum start manual |
| `trade_log.json` | Riwayat trade | referensi |
| `zona_history.json` | Riwayat zona | referensi |

### 2.3 File Yang SUDAH DIARSIPKAN (JANGAN dipulihkan)
- `_arsip/overlay_entry.cjs` & `entry.json` (harga stale 4084/4351.8)
- `_arsip/draw_lines.cjs`, `probe.cjs`, `pine_paste.cjs`, dll (±140 skrip mati)
- 110 .cjs lain di root = utilitas one-off lama. Cek satu-satu sebelum arsip.

### 2.4 Config Penting
- **PINE Study ID**: `ppv22M` (SMC SWING PATEN v2.2) — semua filter MISS ter-encode.
- **TV exe** ada 2 lokasi (LOCALAPPDATA\tradingview-mcp + Program Files\WindowsApps) — `hi_fitra.cjs` handle keduanya.
- **MT5**: akun cent OANDA, pair XAUUSD.

---

## 3. PERINTAH HARIAN (CHEATSHEET)

```
"hi fitra"                    → node C:\HEBAT\hi_fitra.cjs                 (startup lengkap)
Scan pasar                    → node C:\HEBAT\analisa_gabungan.cjs         (PINE + SMC + verdict)
Scan all TF + M5              → node C:\HEBAT\scan_all_tf.cjs              (cek M5 anomaly)
Baca PINE langsung            → node C:\HEBAT\baca_pine.cjs                (PINE_DATA dari chart)
Update overlay                → edit overlay_plan.json / posisi.json, lalu:
                                node C:\HEBAT\overlay_position.cjs
Verifikasi overlay            → node C:\HEBAT\verify_overlay_dom.cjs
Cek log monitor               → Get-Content C:\HEBAT\monitor_limit_xau.log -Tail 20
Restart TV                    → taskkill TradingView.exe
                                → node C:\HEBAT\hi_fitra.cjs
                                → node C:\HEBAT\cycle_tf.cjs               (D→240→60→30→15→5)
Cycle TF                      → node C:\HEBAT\cycle_tf.cjs
Baca candle M5 detail         → node C:\HEBAT\read_m5.cjs                 (OHLCV M5)
```

---

## 3.5 MULTI-TIMEFRAME (MTF) — ALUR LENGKAP D1 → M5

> **Prinsip**: Selalu scan D1 → H4 → H1 → M30 → M15 → M5 berurutan. M5 = deteksi ANOMALI/FAKEOUT yang tidak terlihat di TF besar.

### 3.5.1 Hirarki TF & Fungsinya

| TF | Resolusi | Fungsi | Yang dicari |
|----|----------|--------|-------------|
| **D1** | 1 hari | **Trend besar** | Arah utama pasar, swing major, OB besar |
| **H4** | 4 jam | **Filter momentum** | CHoCH struktural, RSI oversold/overbought ekstrem |
| **H1** | 1 jam | **Konfirmasi** | Pullback sehat, zona demand/supply |
| **M30** | 30 menit | **Setup entry** | FIBO M30 (61.8/78.6), MSNR zone |
| **M15** | 15 menit | **Trigger** | PINE BUY/SELL + CHoCH + candle tegas |
| **M5** | 5 menit | **Anomali/precision** | Fakeout detection, wick rejection, micro structure |

### 3.5.2 Resep Scan MTF (WAJIB IKUTI URUTAN INI)

```powershell
# STEP 1: Scan utama (5 TF utama)
node C:\HEBAT\analisa_gabungan.cjs
# → D1, H4, H1, M30, M15 + PINE + SMC + FIBO + sweep + verdict

# STEP 2: Cycle semua TF termasuk M5 (warm-up PINE)
node C:\HEBAT\cycle_tf.cjs
# → cycle: 5 → D → 240 → 60 → 30 → 15 → 5
# → TUNGGU ~20 detik sampai selesai (ada sleep 2 detik antar TF)

# STEP 3: Scan ulang dengan M5 masuk
node C:\HEBAT\scan_all_tf.cjs
# → output: M5, M15, M30, H1, H4, D1, M5
# → lihat RSI M5 < 30 = oversold extreme
# → lihat MTF field: BULL/BEAR/FLAT per TF

# STEP 4: Baca PINE langsung untuk verdict detail
node C:\HEBAT\baca_pine.cjs
# → format: PINE_DATA|price|rsi|sig|ready|atr|alasan|zona|mid|slSug|tp1|tp2|sesi|MTF

# STEP 5 (opsional): Baca OHLCV M5 untuk analisis candle detail
node C:\HEBAT\read_m5.cjs
# → list 40 candle M5 terakhir dengan body/wick/rejection tag
```

### 3.5.3 Cara Baca Output `scan_all_tf.cjs`

Contoh output:
```
[M5]  price=4310.4 RSI=45.5 sig=FLAT ready=0 alasan=NO_SETUP zona=DISKON mid=4317.3 sesi=LONDON MTF=BULL
[M15] price=4310.4 RSI=43.2 sig=FLAT ready=0 alasan=NO_SETUP zona=DISKON mid=4373.4 sesi=LONDON MTF=BEAR
[M30] price=4310.4 RSI=41.0 sig=FLAT ready=0 alasan=NO_SETUP zona=DISKON mid=4457.3 sesi=LONDON MTF=BEAR
[H1]  price=4310.4 RSI=33.7 sig=FLAT ready=0 alasan=NO_SETUP zona=DISKON mid=4489.9 sesi=LONDON MTF=BEAR
[H4]  price=4310.0 RSI=21.1 sig=FLAT ready=0 alasan=NO_SETUP zona=DISKON mid=4346.6 sesi=LONDON MTF=BEAR
[D1]  price=4309.9 RSI=45.2 sig=FLAT ready=0 alasan=NO_SETUP zona=DISKON mid=4772.2 sesi=NY      MTF=BEAR
```

**Cara interpretasi:**

| Field | Cara baca |
|-------|-----------|
| `price` | Harga saat ini di TF tersebut |
| `RSI` | RSI 7 TF tersebut. **< 30 = oversold**, **> 70 = overbought** |
| `sig` | PINE signal: `FLAT` (netral), `BUY`/`SELL` (sinyal), `ready=100` (valid), `ready=50` (agresif) |
| `alasan` | Alasan PINE: `NO_SETUP`, `RSI_EXT`, `PREMIUM`, `OB_BEAR`, `MTF_CONFLICT`, dll |
| `zona` | `DISKON` (harga < mid) atau `PREMIUM` (harga > mid) |
| `mid` | Mid range TF tersebut (resistance kalau DISKON, support kalau PREMIUM) |
| `sesi` | `ASIA`/`LONDON`/`NY` |
| `MTF` | Alignment TF lain: `BULL`/`BEAR`/`FLAT` × 4 (D1/H4/H1/M15 dilihat dari TF ini) |

### 3.5.4 Pola MTF yang Penting Diperhatikan

#### **Pola A: Konfirmasi BULL lengkap (entry BUY valid)**
- D1/H4/H1/M15 = BULL
- M5 RSI bounce dari < 30 ke > 50
- M5 zona = DISKON
- PINE M15 sig = BUY + ready 100
- CHoCH-B M15 terbentuk
- **= ENTRY VALID** ✅

#### **Pola B: Oversold rebound (hati-hati, bisa lanjut turun)**
- H4 RSI < 25 (extreme oversold)
- D1/H4 = BEAR (struktur masih turun)
- M5 RSI bounce 28 → 45
- PINE FLAT semua
- **= BUKAN sinyal entry**, hanya koreksi. RSI oversold BUKAN jaminan (lihat MISS #6/#7 + Senin-Selasa fakeout).

#### **Pola C: Sweep + fakeout (JANGAN entry di zona pertama)**
- Sweep di ATAS (D1) → entry BUY
- Harga lanjut turun bikin lower low
- Sweep-the-sweep: likuiditas di-sweep 2x
- **= TUNGGU** lower low + CHoCH-B + PINE BUY (MISS #10, #13)

#### **Pola D: Multiple CHoCH-S di level sama = sellers kelelahan**
- CHoCH-S 3x berturut di 4310-4322
- Harga tidak turun
- M5 RSI tetap > 35
- **= BUKAN sinyal SELL**, hanya koreksi. Buyers defend.

#### **Pola E: Breakout + retest (entry ideal)**
- Harga tembus resistance (mis. 4322.5)
- Retest ke 4322.5-4325 (zona breakout jadi support)
- M15 PINE flip BUY + CHoCH-B
- **= ENTRY BREAKOUT VALID** ✅

### 3.5.5 Kenapa M5 Penting (Anti-Fakeout)

- **Fakeout sweep** sering terjadi di M5: spike 5-10 pip lalu reversal cepat.
- **Wick rejection** di M5 = sinyal terkuat bahwa buyer/seller serius.
- **RSI M5 < 30 + bounce ke 50** = konfirmasi momentum awal.
- **Volume M5** (kalau tersedia) = konfirmasi partisipasi institusional.
- **Ciri fakeout di M5**: candle dengan wick panjang 2-3x body + close balik ke sisi berlawanan.

### 3.5.6 M5 sebagai Filter Tambahan

| Skenario | M5 konfirmasi | Aksi |
|----------|---------------|------|
| TF besar searah BULL, M5 RSI 28→50 | M5 **konfirmasi** | Entry BUY ✅ |
| TF besar searah BULL, M5 RSI stuck 35-40 | M5 **ragu-ragu** | TUNGGU M5 tembus 50 |
| TF besar BENTUR, M5 RSI 28→50 | M5 **prematur** | SKIP, tunggu M15/H1 konfirmasi dulu |
| TF besar BULL, M5 RSI 70+ (overbought) | M5 **koreksi akan datang** | Jangan entry baru, partial close posisi |

### 3.5.7 State TF Saat Ini (snapshot 2 Sep 2026)

- D1: BEAR (CHoCH-S aktif, OB BULLISH 4282-4326) — harga sudah tembus OB TOP
- H4: BEAR, RSI 27-28 (extreme oversold) — potential bounce besar
- H1: FLIP BULL setelah bounce dari 4280
- M30: NETRAL (RSI 53-55, transisi)
- M15: BULL (RSI 60-65) — **trigger level**
- M5: BULL (RSI 60-70) — **momentum terkuat**

**Bacaan: pasar dalam transisi BEAR → BULL di TF kecil, TF besar masih BEAR. M15 = TF paling penting sekarang untuk konfirmasi entry baru.**

---

## 4. INDEX PELAJARAN (MISS #1-#13)

> **Setiap loss baru = catat MISS baru di `pelajaran_sl.md` dengan format MISS #12.**

| # | Tanggal | Pelajaran Inti | Rujuk Section |
|---|---------|----------------|---------------|
| #1 | 13 Agu | Zona pinggir + bentur D1/H4 = no-trade | `pelajaran_sl.md` |
| #2 | 14 Agu | Profit management: floating ≥ 1.5R → BE | `pelajaran_sl.md` |
| #3 | 14 Agu | TP di demand = handoff, bukan auto-buy | `pelajaran_sl.md` |
| #4 | 14 Agu | Swing jauh → jangan TP1 full close | `pelajaran_sl.md` |
| #5 | 14 Agu | Trending → jangan pakai BUY LIMIT bawah | `pelajaran_sl.md` |
| #6 | 14 Agu | SELL tanpa PINE/CHoCH = SKIP | `pelajaran_sl.md` |
| #7 | 14 Agu | SL di tepi obvious = magnet hunt | `pelajaran_sl.md` |
| #8 | 18 Agu | SL swing WAJIB sub-struktur + buffer | `pelajaran_sl.md` |
| #9 | 19 Agu | RSI ekstrem + OB BEAR + PREMIUM = jangan BUY STOP | `pelajaran_sl.md` |
| #10 | 20 Agu | Pasca-sweep, jangan entry di 78.6% pertama | `pelajaran_sl.md` |
| #11 | 21 Agu | Limit HANYA di DISKON + validasi 3 syarat saat terisi | `pelajaran_sl.md` |
| #12 | 24 Agu | Post-sell-side sweep: tunggu PINE/CHoCH, entry bisa lebih dalam | `pelajaran_sl.md` |
| #13 | 1 Sep | 2 loss = STOP TOTAL + entry di PREMIUM = melangar M11 | `pelajaran_sl.md` |

> **Lihat `pelajaran_sl.md` untuk detail lengkap (root cause + rule baru) setiap MISS.**

---

## 5. METODOLOGI ANALISIS (IKUTI RESEP INI)

### 5.1 Sumber Data (urutan)
1. `node C:\HEBAT\analisa_gabungan.cjs` → SMC + PINE + FIBO + sweep + verdict
2. `node C:\HEBAT\scan_all_tf.cjs` → cek M5 anomaly
3. `node C:\HEBAT\baca_pine.cjs` → PINE field detail (alasan/zona/MTF)
4. Baca `posisi.json` + `monitor_limit_xau.log` untuk posisi live

### 5.2 Baca Hasil Scan
- **Trend 4TF**: SEARAH semua = bebas entry searah. BENTUR (D1/H4 bull vs H1/M15 bear) = **PULLBACK** → default NO ENTRY sampai zona/konfirmasi datang.
- **SWEEP di ATAS**: buy-side liquidity tersapu → bias short-term TURUN. Sweep **BUKAN** sinyal entry.
- **RANGE mid**: > mid = PREMIUM (anti-BUY). < mid = DISKON (pro-BUY).
- **OB**: harga DI DALAM OB aktif = jangan entry menembus arah OB.
- **FVG**: sering jadi magnet retest.
- **BRK**: breaker block = support↔resistance yang sudah ganti peran.
- **FIBO**: demand 61.8-78.6% = zona BUY. Retest-sell 14.5-25%. **EXT = runner only**.
- **PINE sig**: FLAT = tidak ada izin. BUY/SELL `ready=100` = konfirmasi penuh. `ready=50` = AGRESIF (raw signal terfilter).

### 5.3 GATE ENTRY (WAJIB LOLOS SEMUA, BERURUTAN)
1. **Zona**: BUY di DISKON (prioritas `61.8% ∩ FVG` > `50% ∩ OB` > `38.2`). SELL: D1 BEARISH + PREMIUM.
2. **Konfirmasi**: PINE M15 searah + CHoCH searah. Tanpa ini = AGRESIF.
3. **SL struktural**: swing = sub-struktur + buffer 5-10 pip. Scalp = 10 pip.
4. **RR & jatah**: TP1 ≥ 1:3, TP2 ≥ 1:4. Jatah harian tersisa. Belum kena 2 loss.
5. **Double-plan**: satu limit keisi → LANGSUNG cancel yang satunya.

### 5.4 Format Jawaban ke Fitra
1. Tabel trend 4TF + RSI + candle body/wick tiap TF
2. Status sweep & posisi harga relatif mid (PREMIUM/DISKON)
3. Peta level kunci (SL/TP kedua plan + zona FVG/OB/FIBO terdekat)
4. Verdict tegas: `NO ENTRY` / `VALID` / `AGRESIF (berisiko)` + rujuk MISS #
5. Sniper opsional HANYA kalau ada skenario trigger jelas
6. **CHECK STATUS POSISI** (wajib, permintaan 28 Agu): kondisi + keselarasan strategi + AKSI KONKRET (hold / geser SL / partial / cut / tunggu level apa)

---

## 6. INVENTARIS MODUL STRATEGI (WARISAN — JANGAN DIHAPUS/DILOMPATI)

> Prinsip user: "gunakan literally semua strategi saya".

### 6.1 Modul di `analisa_gabungan.cjs` (13 modul)
| # | Modul | Output |
|---|-------|--------|
| 1 | SMC Analyzer MTF | Baris `[1440]/[240]/[60]/[30]/[15]` + `SMC:` |
| 2 | PINE reader | `price|rsi|sig|ready|atr|alasan|zona|mid|slSug|tp1|tp2|sesi|MTF` |
| 3 | Trend 4TF | SEARAH vs BENTUR |
| 4 | Swing Likuiditas | `SWEEP di ATAS/BAWAH` |
| 5 | Range Premium/Diskon | mid + status PREMIUM/DISKON |
| 6 | FIBO per TF | Leg + 38.2/50/61.8/78.6 + EXT |
| 7 | FILTER FIBO M30 (MSNR) | kandidat BUY (BELUM valid) |
| 8 | FILTER FVG/OB × zona | validasi cross-zona |
| 9 | SNIPER per TF | risk kecil di FVG terdekat |
| 10 | Kualitas candle | body ≥0.45 + wick |
| 11 | Verdict Gabungan | NO ENTRY / PULLBACK D1 VALID / SETUP VALID |
| 12 | Plan limit otomatis | Generate limit → `overlay_plan.json` (TIDAK menimpa manual) |
| 13 | RSI rules | Ekstrem ≠ reversal |

### 6.2 Modul PINE `SMC SWING PATEN v2.2` (8 modul)
1. Struktur (swing/BOS/CHoCH/konfirmasi body)
2. Sweep likuiditas + blokir post-sweep (M10 simetris)
3. FVG & OB zona state
4. Range premium/diskon + garis mid
5. FIBO otomatis (demand 61.8-78.6, retest 14.5-25)
6. Filter pelajaran (RSI ekstrem M9, PREMIUM M11, OB, post-sweep, SELL wajib D1 bear)
6B. MTF EMA50 (D1/H4/H1/M15; H4 lawan = blokir, H1 lawan = warning)
7. Verdict engine (BUY/SELL valid vs agresif ready=50 + alasan blokir)
8. Grafik + label PINE_DATA + tabel MTF

### 6.3 Alur Analisis Standar (resep AI)
```
1. node analisa_gabungan.cjs       → baca SEMUA bagian output
2. node scan_all_tf.cjs            → cek M5 anomaly
3. node baca_pine.cjs              → field verdict PINE (alasan/zona/MTF)
4. Terapkan GATE 5.3 berurutan     → zona → konfirmasi → SL → RR/jatah → double-plan
5. Cek posisi hidup                → posisi.json + monitor_limit_xau.log
6. Jawab dengan format 5.4         → tabel TF, sweep/PD, peta level, verdict + MISS, sniper
7. Update posisi.json/entry_hari   → setiap event fill/SL/TP
8. CHECK STATUS POSISI             → keselarasan strategi + AKSI KONKRET
```

---

## 7. JEBAKAN YANG SUDAH TERBUKTI (JANGAN ULANGI)

1. **Tick palsu TradingView** — pernah terbaca 159.32 (nyata ~4.630) → monitor salah deteksi fill+SL. **Filter glitch ADA di monitor** — JANGAN hapus.
2. **PINE `none` semua TF** setelah restart = glitch tampilan, bukan sinyal. → Cycle timeframe (D→240→60→30→15→5) untuk warm-up.
3. **`overlay_entry.cjs` & `entry.json` SUDAH DIARSIPKAN** — harga stale. Jangan dipulihkan.
4. **Monitor dobel** = log kacau + deteksi rusak. Selalu cek `monitor.lock` sebelum start manual.
5. **PowerShell merusak JSON** saat passing `--overrides` ke CLI MCP → tulis lewat file `.cjs`, bukan inline.
6. **TV exe 2 lokasi** (LOCALAPPDATA + Program Files) — `hi_fitra.cjs` sudah handle.
7. **Limit lama** yang harga-nya sudah 100+ pip dari sekarang = **HAPUS** (bukan ditinggali).
8. **Order lama di MT5** harus di-cancel manual (tidak bisa dari skrip) sebelum ada spike.

---

## 8. OPEN QUESTIONS (PRIORITAS)

- **Konversi USC/pip belum terverifikasi.** Rumus lama: 1 pip @0.05 lot = 500 USC (tidak masuk akal vs saldo). Cek MT5 → History → trade BUY 4661.8 (SL 24 Agu, -30 pips) → berapa USC terpotong? Itu jawabannya.
- Setelah jelas: pastikan risiko per trade ≤ 2% saldo (2.000 USC = maks ~40 USC/trade).

---

## 9. STATE LIVE (2 SEP 2026)

### 9.1 Posisi Aktif
- **SWING TRADE**: BUY 4310 @0.05 × 2 layer
  - SL: **BE (4310)** = risiko 0
  - TP1: 4374 (+63 pip, partial 50%)
  - TP2: 4457 (+126 pip, partial 30%)
  - TP3: 4549 (+218 pip, partial 20%)
  - Runner: 4600+ (+269 pip, trailing SL)
  - Status: **AKTIF + PROFIT +24+ pip** (harga 4334-4337, MTF BULL flip)
  - Timeline: 4-5 hari
- **Buy Limit 4287** (backup, kemungkinan besar TIDAK terisi karena harga sudah naik ke 4330+)
- **SELL 4538**: BATAL (harga jauh di bawah)

### 9.2 Jatah Harian
- Tanggal: 2026-09-02
- Entry ke: 1 (BUY 4310)
- Sisa jatah: 2
- Loss count: 0

### 9.3 Level Kritis Live
- D1 OB BULLISH: 4282.6-4326.8 (harga sudah tembus TOP, jadi support)
- H4 CHoCH-S: 4322.5-4337 (resistance test sekarang)
- H4 mid: 4346 (target berikutnya)
- Mid H4/H1: 4374 (TP1)
- M30 FIBO: 4457 (TP2)
- D1 FIBO 38.2%: 4549 (TP3)
- D1 FIBO 50%: 4504
- D1 mid: 4772 (jauh)
- D1 high sebelumnya: 4697.1

### 9.4 Pola Candle (Senin-Selasa 31 Agu-1 Sep) — untuk antisipasi fakeout
1. **Sweep-the-sweep** — buy-side sweep di 4367 (D1) → entry BUY 4400/4370 → SL kena 4355 → harga lanjut ke 4280. Lesson: jangan entry di zona pertama pasca-sweep.
2. **Distribusi di zona tengah** — harga stabil di 4400 (terlihat support) → ternyata distribusi, langsung tembus.
3. **Dead cat bounce** — bounce 4287→4325 (+38 pip) tanpa konfirmasi → turun lagi ke 4302.
4. **CHoCH-S palsu** — multiple CHoCH-S di 4310-4322 → sellers kelelahan, harga tidak turun.
5. **RSI oversold ≠ bounce** — H4 RSI 20-21, harga tetap turun ke 4280. Lesson: RSI ekstrem BUKAN jaminan reversal.

### 9.5 Ciri Setup SEKARANG (yang sedang terjadi) — BEDA dari fakeout kemarin
- ✅ Zona **DISKON** (entry 4310 < mid 4374.5)
- ✅ H4 RSI **oversold** (28, bukan overbought)
- ✅ D1 OB **BULLISH** defend (4282-4326)
- ✅ MTF **BULL flip** (M5/M15/H1/D1)
- ✅ SL di **BE** = risiko 0
- vs fakeout kemarin: entry PREMIUM, RSI overbought, tanpa konfirmasi, SL tipis.

---

## 10. GAYA KERJA AI PENERUS

- **Selalu update `posisi.json` + `entry_hari.json`** SETIAP event: limit terisi, SL kena, TP kena.
- **Setiap loss → catat MISS baru** di `pelajaran_sl.md` (format: tiru MISS #12) SEBELUM analisa lanjutan.
- **Jangan pernah melonggarkan aturan paten** demi "kesempatan emas". Tidak ada setup valid = NO ENTRY.
- **2 loss = STOP TOTAL** — anti balas dendam.
- **Entry tanpa konfirmasi = AGRESIF** — catat di MISS dan siap cut cepat.
- **Sweep ≠ sinyal entry** — tunggu rejection + CHoCH-B + PINE.
- **SL struktural sub-struktur** + buffer 5-10 pip, bukan di tepi obvious.
- **Partial close** di setiap TP + geser SL = kunci profit management.
- **Limit lama** yang tidak relevan = hapus, jangan ditinggali.
- **Order MT5 lama** harus di-cancel manual sebelum ada spike (tidak bisa otomatis).
- **Sabar** — setup terbaik = yang menunggu, bukan yang mengejar.

---

## 11. PERBEDAAN DENGAN AGENTS.md LAMA

- **AGENTS.md** masih ada sebagai legacy & referensi workflow awal.
- **KNOWLEDGE_BASE.md** (file ini) = versi **KONSOLIDASI** yang:
  - Menggabungkan AGENTS.md + pelajaran_sl.md
  - Menambahkan state live (2 Sep 2026)
  - Menambahkan analisis pola fakeout
  - Menambahkan perbandingan setup sekarang vs fakeout kemarin
  - Index pelajaran MISS #1-#13 di section 4
  - Lebih terstruktur untuk AI consumption (section bernomor, ringkas, scan-friendly)
- **Tetap rujuk `pelajaran_sl.md`** untuk detail lengkap setiap MISS.
- **Tetap rujuk `PATEN.md`** untuk aturan paten versi keputusan final (10-13 Agu 2026, roadmap saldo, matriks probabilitas CHoCH, Fibonacci).
- **Tetap rujuk `pengetahuan_fibo.md`** untuk aturan FIBO + scoring zona + invalidasi.
- **Tetap rujuk `SNIPER.md`** untuk aturan sniper entry (identifikasi area, tekanan harga, eksekusi limit).
- **Tetap rujuk `backtest_framework.md`** untuk kerangka backtest/matriks simulasi.
- **File-file legacy ini TIDAK dihapus** — KNOWLEDGE_BASE.md hanya konsolidasi referensi, bukan pengganti.

---

## 12. QUICK REFERENCE — LEVEL PENTING YANG SERING DIGUNAKAN

### 12.1 Mid Range (anti-BUY jika di atasnya)
- **D1 mid**: 4772.2 (jauh di atas, jarang relevan)
- **H4 mid**: 4346.6
- **H1 mid**: 4489.9
- **Mid H4/H1 standar paten**: **4374.5** (level rujukan BUY/SELL paten)

### 12.2 OB Kunci (Demand/Supply)
- **D1 OB BULLISH** (aktif): 4282.6 - 4326.8 (harga sudah tembus TOP, jadi support)
- **D1 OB BEARISH** (aktif): 4229.9 - 4371.8 (harga di dalamnya)
- **H4 OB BULLISH**: 4288.4 - 4310.0
- **FVG BEARISH M30** (gap di atas): 4472.2 - 4564.3

### 12.3 CHoCH Levels (resistance/support)
- **H4 CHoCH-S**: 4316.9, 4322.5
- **H1 CHoCH-S**: 4309.8, 4312.4, 4318.8
- **M30 CHoCH-S**: 4311.0, 4311.4, 4311.9, 4315.4, 4322.5
- **M15 CHoCH-S**: sama dengan M30

### 12.4 FIBO Levels (dari D1 leg bearish 4311 → 4697.1)
- 38.2% = **4549.6**
- 50% = **4504.1**
- 61.8% = **4458.5** (TP2 standar paten)
- 78.6% = **4393.7**

### 12.5 BUY STOP/STOP lama yang HARUS di-cancel manual di MT5
- Sell Limit 0.05 × 3 @ 4538 (BATAL)
- Buy Stop 0.05 × 3 @ 4400 (SL KENA kemarin)
- Buy Stop 0.05 × 2 @ 4370 (SL KENA kemarin)
- Buy Stop 0.01 @ 4360
- Buy Stop 0.05 @ 4330
- Buy Limit 0.03 @ 4287 (DUPLICATE)

### 12.6 Order Aktif (setelah cancel)
- **Buy Limit 0.05 @ 4287** × 2 layer (harga sudah di atas, kemungkinan TIDAK terisi)
- **BUY 4310 @0.05 × 2** (sudah terisi manual, swing trade aktif, SL BE)

---

*Dikonsolidasi 2 Sep 2026 oleh AI (Fatra). Semoga profit selalu, Fitra.*
