# AGENTS.md — PETA SISTEM TRADING FITRA (XAUUSD)

> Dokumen ini untuk AI MANA PUN yang meneruskan kerja. Baca habis-habisan sebelum bertindak.

## 1. KONTEKS USER
- **Fitra**, trader XAUUSD (OANDA) di **akun standard MT5**, dibantu AI bernama "Fatra".
- Misi: konsisten ikut aturan paten → profit konsisten.
- Saldo: **Rp24.000.000 (Exness, akun IDR, standard)** per 7 Okt 2026 — sebelumnya Rp2.500.000 (1 Okt), $2.200 OANDA (lama).
- Gaya komunikasi: Bahasa Indonesia santai, tapi DISIPLIN KERAS soal aturan.

## 2. ATURAN PATEN (ringkas — detail & kisah lengkap: `pelajaran_sl.md`)
- SL 10 pips (scalp) / struktural + buffer di bawah/atas sweep (swing, MISS #7/#8/#12).
- TP1 = 1:3, TP2 = 1:4. FIBO EXT hanya bonus runner, jangan ditahan paksa.
- Jatah **3 entry/hari**; **2 loss = STOP TOTAL** hari itu (anti balas dendam).
- **BUY hanya di DISKON** (di bawah mid range); **SELL hanya jika D1 BEARISH** + harga PREMIUM (MISS #6/#11).
- Entry tanpa konfirmasi = larangan: tunggu **PINE M15 searah + CHoCH** (MISS #9/#10/#12).
- Limit yang harganya sudah jauh melenceng = HAPUS, jangan dibiarkan (MISS #5/#11).
- **Layer ≠ jatah** (Pilihan B): 1 entry = 2 layer @**0.1** lot → L1 tutup di TP1 (1:3), L2 runner ke TP2 (1:4). Setelah TP1 kena: **geser SL L2 ke BE**.
- **Protokol eksekusi standar (revisi 26 Aug — cara Fitra sebenarnya)**:
  - **SEMUA entry = LIMIT ORDER swing** (taruh limit di zona → tunggu terisi → kelola sampai TP/SL). Bukan scalp chase dengan SL kaku.
  - **Setup zona dekat** = 2 layer @**0.1** lot → L1 tutup di TP1 (1:3), L2 runner ke TP2 (1:4). Setelah TP1: **SL L2 ke BE**.
  - **Setup SWING JAUH** (FIBO EXT / zona diskon dalam) = **1 layer @0.05-0.1** lot → target EXT/trailing.
  - **SL selalu struktural** (di luar sweep/swing + buffer) — bukan 10 pips kaku. Hasil akhir hanya 2: TP kena atau SL kena.

## 3. FILE INTI (pipeline utama — jangan diubah sembarangan)
| File | Fungsi |
|---|---|
| `hi_fitra.cjs` | STARTUP ALL-IN-ONE: nyalakan TV → health check → pasang overlay → scan gabungan → start monitor. **Trigger chat: user bilang "hi fitra".** |
| `analisa_gabungan.cjs` | Scan penuh: PINE + analyzer SMC SWING PATEN v1 + RSI + FIBO + deteksi sweep + verdict NO ENTRY/PULLBACK. Otomatis re-inject overlay di akhir. |
| `overlay_position.cjs` | Inject panel HTML (`smc_overlay`) ke chart TradingView via CDP :9222. **Data-driven**: baca `posisi.json` + `entry_hari.json`. Jalankan ulang setelah edit data. |
| `monitor_limit_xau.cjs` | Pantau limit pending (dari `overlay_plan.json`) + posisi aktif (dari `posisi.json`) tiap 60 dtk. Ada **FILTER GLITCH** (tolak tick mustahil). Log → `monitor_limit_xau.log`. |
| `auto_start_watch.cjs` | Watcher background: TV menyala → auto overlay + scan; start monitor **dengan lock** anti-dobel. |
| `verify_overlay_dom.cjs` | Cek panel overlay benar-benar muncul di DOM TV. |
| `chart_lock.cjs` | **MODUL LOCK BERSAMA** — semua skrip yang MENULIS chart (ganti symbol/TF) wajib `acquire()` dulu, selesai `release()`. Cegah race. |
| `warmup_pine.cjs` | Warm-up PINE (jebakan #2) **dengan lock**. **PAKAI INI, jangan tulis loop `timeframe --set` manual.** |

## 4. FILE DATA (sumber kebenaran — EDIT INI, jangan hardcode di skrip)
| File | Isi |
|---|---|
| `overlay_plan.json` | Plan limit aktif (`plan_a_sell`, `plan_b_buy`) + syarat + aturan double-plan. |
| `posisi.json` | Posisi live. WAJIB ada: `active`, `entry`, `sl`, `tp1`, `tp2`, `title` (title harus mengandung kata BUY/SELL untuk deteksi arah). |
| `entry_hari.json` | Jatah harian: `tanggal`, `sisa_jatah`, `loss_count`. **Reset manual saat tanggal berganti** (jatah 3, loss 0). |
| `pelajaran_sl.md` | SEMUA pelajaran (MISS #1-#13). **AI BARU WAJIB BACA INI DULU.** Format catatan loss baru: tiru MISS #12. |
| `monitor.lock` | PID monitor aktif (anti duplikasi). |
| `chart.lock` | Lock chart TV (otomatis). Kalau ada isinya = skrip lain sedang baca/pindah chart. Aman diabaikan kalau PID di dalamnya sudah mati (auto-stale 10 mnt). |
| `trade_log.json`, `zona_history.json` | Riwayat trade lama (referensi). |

## 5. PERINTAH HARIAN
```
"hi fitra"                -> node C:\HEBAT\hi_fitra.cjs        (startup lengkap)
Scan pasar                 -> node C:\HEBAT\analisa_gabungan.cjs
Update overlay             -> edit overlay_plan.json / posisi.json, lalu:
                              node C:\HEBAT\overlay_position.cjs
Verifikasi overlay         -> node C:\HEBAT\verify_overlay_dom.cjs
PINE 'none' di semua TF    -> node C:\HEBAT\warmup_pine.cjs   (JANGAN cycle manual)
DXY/korelasi emas          -> node C:\HEBAT\usdxau_correlation.cjs  (switch chart, auto-restore)
Cek log monitor            -> Get-Content C:\HEBAT\monitor_limit_xau.log -Tail 20
Restart TV                 -> taskkill TradingView.exe, lalu jalankan hi_fitra.cjs,
                              LALU node C:\HEBAT\warmup_pine.cjs (warm-up PINE)
```

## 6. JEBAKAN YANG SUDAH TERBUKTI (JANGAN ULANGI)
1. **Tick palsu TradingView**: pernah terbaca harga `159.32` padahal nyata ~4.630 → bikin monitor salah deteksi fill+SL. Filter glitch SUDAH ADA di monitor — **jangan hapus**.
2. **PINE `none` di semua TF** setelah restart = glitch tampilan, bukan sinyal. Cycle timeframe untuk warm-up.
3. **`overlay_entry.cjs` & `entry.json` SUDAH DIARSIPKAN** ke `_arsip/` — berisi harga stale 4084/4351.8. Jangan dipulihkan, jangan dipakai.
4. **Monitor dobel** = log kacau & deteksi rusak. Selalu cek `monitor.lock` sebelum start monitor manual.
5. **PowerShell merusak JSON** saat passing `--overrides` ke CLI MCP → tulis lewat file `.cjs`, bukan inline.
6. **TV exe ada 2 lokasi** (LOCALAPPDATA\tradingview-mcp\... dan Program Files\WindowsApps\...) — `hi_fitra.cjs` sudah handle keduanya.
7. **RACE CHART (2 Okt 2026)** — `usdxau_correlation` (switch symbol), `analisa_gabungan` (cycle TF), `warmup_pine`, dan monitor GUARD TF semuanya MENULIS chart yang sama. Kalau jalan bareng → PINE terbaca dari symbol/TF salah (terbukti: PINE DXY 102.x terbaca saat scan XAUUSD). **SOLUSI: `chart_lock.cjs`** — semua penulis wajib `acquire()`/`release()`; monitor otomatis menunda auto-set M15 selama lock dipegang. Jangan tulis skrip baru yang `setResolution`/`symbol --set` tanpa lock ini.
8. **`analisa_gabungan` dulu tidak pernah menampilkan PINE** (`PINE:none` / `PINE n/a`) karena `readPine()` mengembalikan *string* sedangkan `parsePineData()` mengharap *objek* `{t}` — retry tak pernah cocok (buang 20 dtk/TF) lalu hasilnya null. SUDAH DIPERBAIKI (baca objek label + terima string juga). Kalau hasil scan kembali `PINE n/a` di semua TF → periksa regresi ini dulu.
9. **Jangan jalankan `usdxau_correlation.cjs` bersamaan siklus warm-up manual** — sama seperti jebakan #7; kalau ragu, jalankan berurutan atau lewat lock.
10. **Monitor dulu salah baca PINE** (`PINE=BEAR RSI=BEAR` di log) karena prefix `indexOf('PINE_DATA')===0` ikut match label `PINE_DATA_JSON|{...}` → split `|` menghasilkan potongan `mtf "BEAR|BEAR|..."`. Akibat: RSI/sig salah + peringatan MISS #12 tak pernah bisa lolos konfirmasi. SUDAH DIPERBAIKI (prefix `PINE_DATA|`). Kalau log monitor kembali `PINE=BEAR RSI=BEAR` → regresi parsing ini. Format label pipe yang benar: `PINE_DATA|price|rsi|sig|ready|atr|alasan|zona|mid|...` (`[2]`=rsi, `[3]`=sig).

11. **PAKET BASIC = MAKS 2 INDIKATOR PER CHART** (19 Okt 2026). Menambah indikator ke-3 memunculkan modal upsell "Lebih banyak indikator…" dan penambahan DITOLAK. Modal itu menampilkan daftar indikator **stale** (masih menyebut indikator yang sudah dihapus) — abaikan daftarnya, hitung sendiri lewat `state`. Kalau perlu pasang yang lain: hapus dulu salah satu (`indicator remove <id>`).
12. **"Tambah kedalam chart" dari Pine Editor** sering butuh 2 langkah: (a) kalau skrip punya perubahan belum tersimpan, TV menampilkan dialog **"Simpan skrip ini sebelum menambahkannya?"** → klik tombol **Simpan** di dialog (bukan yang di header), baru indikator masuk; (b) kliknya harus mouse event asli (`ui mouse` di tengah `getBoundingClientRect`), klik JS (`ui click`) sering tidak register. **Screenshot region "chart" itu di-scale** — jangan ambil koordinat klik dari gambar, selalu ambil rect dari DOM via `ui eval`. Untuk bikin file baru tanpa menimpa yang lama: dropdown judul skrip → **"Buat salinan…"**.
13. **`config.json` menyimpan `pineStudyId`** — kalau indikator SMC dihapus/di-add ulang, id entity BERUBAH (19 Okt: `lX3BtG` → `ypai3y`) dan WAJIB di-update, kalau tidak skrip pipeline baca study salah. Cek `node C:\HEBAT\tradingview-mcp\src\cli\index.js state` untuk id terbaru, verifikasi dengan `node C:\HEBAT\baca_pine.cjs`.

## 7. OPEN QUESTIONS (prioritas selesaikan)
- ✅ Akun sekarang **Rp24.000.000 (Exness, akun IDR)** per 7 Okt 2026 (sebelumnya Rp2.500.000).
- ✅ `risk_calculator.json` SUDAH ditulis ulang ke Rp24jt: 2% = **Rp480.000 = $30**, lot maks: SL10 → 0.30, SL30 → 0.10, SL135 → 0.02.
- ✅ **Contract size = 100 oz KONFIRMASI** (7 Okt, dari P/L live: 1.0 lot 21 pip = ~Rp35jt ⇒ $100/pip). Angka lama 10 oz SALAH — jangan dipakai. Akibat: lot maks SL10 → 0.03, SL30 → 0.01, swing SL135 → TIDAK BISA di 2%.
- ⚠️ **Belum diverifikasi**: `Contract size` XAUUSD Exness (hitungan sekarang = 10 oz dari rumus & riwayat trade). Cek di MT5: klik kanan XAUUSD → Specification. **Kalau 100, semua risiko ×10** (lihat blok `jika_kontrak_100oz`).
- Spread: 0.2 pip. Min lot 0.01.
- ⚠️ SL struktural swing (60-135 pip) **TIDAK BISA** di akun ini pada risiko 2% — butuh modal ≥ Rp10,8jt.

## 8. GAYA KERJA AI PENERUS
- Selalu update `posisi.json` + `entry_hari.json` SETIAP event: limit terisi, SL kena, TP kena.
- Setiap loss → catat MISS baru di `pelajaran_sl.md` (format: lihat MISS #12) SEBELUM analisa lanjutan.
- Jangan pernah melonggarkan aturan paten demi "kesempatan emas". Tidak ada setup valid = NO ENTRY.
- Struktur folder: `_arsip/` berisi ±140 skrip mati (draw_lines, probe, pine_paste, dll) — abaikan.
- Sisa ~110 .cjs di root adalah utilitas one-off lama; kalau mau efisien penuh, arsipkan juga — tapi CEK dulu satu-satu, jangan asal pindah.

## 9. METODOLOGI ANALISIS (IKUTI INI SUPAYA HASILNYA KONSISTEN)

### 9.1 Sumber data
- SELALU mulai dengan `node C:\HEBAT\analisa_gabungan.cjs` — dia menjalankan PINE v2 + analyzer SMC + RSI + FIBO + deteksi sweep sekaligus.
- **PINE v2 = "PATEN GABUNGAN"** (`smc_swing_paten_v2.pine`, judul chart: SMC SWING PATEN v2): semua pelajaran MISS di-encode langsung — filter PREMIUM/DISKON (M11), RSI ekstrem (M9), blokir BUY pertama pasca sweep-atas sampai CHoCH-B (M10), SELL wajib D1 bearish (M11), SL/TP saran otomatis RR 1:3/1:4, label SWEEP-ATAS/BAWAH, garis mid-range. Verdict: sig=BUY/SELL hanya kalau LOLOS semua filter; ready=50 berarti sinyal mentah terfilter (agresif); alasan blokir ada di field `alasan`.
- Format label `PINE_DATA` (dibaca via CDP): `price|rsi|sig|ready|atr|alasan|zona|mid|slSug|tp1Sug|tp2Sug|sesi` — 5 field pertama sama dengan v1 (kompatibel).
- Harga live bisa diambil monitor/log; untuk tick manual pakai CLI MCP (`quote`, `ohlcv`).

### 9.2 Cara membaca hasil scan
| Komponen | Interpretasi |
|---|---|
| `Trend 4TF` | SEARAH semua = bebas entry searah. BENTUR (mis. D1/H4 bull vs H1/M15 bear) = itu PULLBACK, default NO ENTRY sampai zona/konfirmasi datang |
| `SWEEP ... di ATAS` | Buy-side liquidity tersapu → bias short-term TURUN (distribusi). `di BAWAH` = sell-side tersapu → bias NAIK (akumulasi). **Sweep ≠ sinyal entry langsung** |
| `RANGE ... mid` | Harga > mid = **PREMIUM** (BUY dilarang, MISS #11); < mid = **DISKON** (zona BUY). Mid = (high+low)/2 range H4/H1 |
| `OB` | Order block = supply/demand. Harga DI DALAM OB aktif = jangan entry menembus arah OB |
| `FVG` | Fair value gap / imbalance — sering jadi magnet retest |
| `BRK` | Breaker block = level yang sudah ganti peran (support↔resistance) |
| `FIBO` | Retest-sell zone 14.5-25% leg; demand 61.8-78.6% leg; **EXT hanya target runner** (jarang kena — lihat pelajaran EXT) |
| `PINE sig` | FLAT = tidak ada izin apapun. `BUY`/`SELL` dengan `ready=100` = konfirmasi penuh |

### 9.3 GATE ENTRY (semua harus lolos, berurutan)
1. **Zona**: BUY hanya di DISKON — prioritas `61.8% ∩ FVG` > `50% ∩ OB` > `38.2`. SELL hanya jika D1 BEARISH + harga PREMIUM.
2. **Konfirmasi**: PINE M15 searah + CHoCH searah. Tanpa ini = entry AGRESIF → catat & siap cut cepat (MISS #12).
3. **SL struktural**: swing = di luar sweep low/high + buffer 5-10 pips (JANGAN tepat di tepi obvious = magnet hunt, MISS #7/#8). Scalp = 10 pips.
4. **RR & jatah**: minimal TP1 1:3, TP2 1:4. Jatah harian tersisa. Belum kena 2 loss.
5. **Double-plan**: satu limit keisi → LANGSUNG cancel yang satunya (jangan hedging).

### 9.4 Konteks sesi (jam WIB)
Asian 05:00-14:00 (vol rendah-menengah) | London 14:00-20:00 (tinggi) | NY 20:00-05:00 (tinggi) | Overlap London+NY 20:00-23:00 (tertinggi). Setup besar lebih valid saat volatilitas cukup; jangan chase breakout di sesi sepi.

### 9.5 Format jawaban analisis ke Fitra
1. Tabel trend 4TF + RSI + candle body/wick tiap TF
2. Status sweep & posisi harga relatif mid (PREMIUM/DISKON)
3. Peta level kunci (SL/TP kedua plan + zona FVG/OB/FIBO terdekat)
4. Verdict tegas: `NO ENTRY` / `VALID` / `AGRESIF (berisiko)` + alasannya rujuk MISS #
5. Sniper opsional HANYA kalau ada skenario trigger yang jelas

## 10. INVENTARIS LENGKAP MODUL STRATEGI FITRA (SEMUA WAJIB DIPAKAI — JANGAN ADA YANG DIHAPUS)

> Prinsip user: "gunakan literally semua strategi saya". Modul di bawah adalah WARISAN —
> boleh dirapikan/didokumentasikan, TIDAK BOLEH dihapus atau dilompati saat analisis.

### 10.1 Modul di `analisa_gabungan.cjs` (13 modul)
| # | Modul | Fungsi | Cara baca output |
|---|-------|--------|------------------|
| 1 | SMC Analyzer MTF (`smcJSON`) | Trend, RSI, SMA20, swing, BOS/CHoCH, OB, FVG, Breaker per TF | Baris `[1440]/[240]/[60]/[30]/[15]` + `SMC:` |
| 2 | PINE reader | Baca label `PINE_DATA` dari indikator chart | `price\|rsi\|sig\|ready\|atr\|alasan\|zona\|mid\|slSug\|tp1\|tp2\|sesi\|MTF` |
| 3 | Trend 4TF | Alignment D1/H4/H1/M15 | SEARAH = bebas entry searah; BENTUR = mode pullback, default NO ENTRY |
| 4 | Swing Likuiditas | Sweep atas/bawah dari label PINE | `SWEEP di ATAS` = bias turun; `di BAWAH` = bias naik; sweep ≠ entry langsung |
| 5 | Range Premium/Diskon | mid = (high+low)/2 range H4/H1 | > mid = PREMIUM (anti-BUY); < mid = DISKON (pro-BUY) |
| 6 | FIBO per TF | Leg + 38.2/50/61.8/78.6 + EXT | demand 61.8-78.6% = zona BUY; retest-sell 14.5-25%; **EXT = runner only** |
| 7 | FILTER FIBO M30 (MSNR) | Zona demand/retest M30 | "kandidat BUY tunggu konfirmasi" = BELUM valid, jangan dieksekusi |
| 8 | FILTER FVG/OB × zona | FVG/OB bullish valid hanya di DISKON; bearish hanya di PREMIUM | Jangan entry menentang arah zona |
| 9 | SNIPER per TF | Setup risk kecil di FVG terdekat | Tetap tunduk gate paten (D1 filter, konfirmasi, jatah) |
| 10 | Kualitas candle | Body ratio ≥0.45 + wick | Konfirmasi candle tegas wajib |
| 11 | Verdict Gabungan | NO ENTRY / PULLBACK D1 VALID / SETUP VALID | Ikuti urutan gate 9.3 |
| 12 | Plan limit otomatis | Generate limit → `overlay_plan.json` | Tunduk pada plan manual aktif (tidak menimpa) |
| 13 | RSI rules | Ekstrem ≠ reversal | Butuh divergence + CHoCH + candle (MISS #6/#7) |

### 10.2 Modul di PINE `SMC SWING PATEN v2.2` (8 modul)
1. Struktur (swing/BOS/CHoCH/konfirmasi body) — 2. Sweep likuiditas + blokir post-sweep (M10 simetris) — 3. FVG & OB zona state — 4. Range premium/diskon + garis mid — 5. FIBO otomatis (demand 61.8-78.6, retest 14.5-25) — 6. Filter pelajaran (RSI ekstrem M9, PREMIUM M11, OB, post-sweep, SELL wajib D1 bear) — 6B. MTF EMA50 (D1/H4/H1/M15; H4 lawan = blokir, H1 lawan = warning) — 7. Verdict engine (BUY/SELL valid vs agresif ready=50 + alasan blokir) — 8. Grafik + label PINE_DATA + tabel MTF.

### 10.3 Alur analisis standar (resep AI penerus — lakukan selalu berurutan)
```
1. node C:\HEBAT\analisa_gabungan.cjs        -> baca SEMUA bagian output
2. node C:\HEBAT\baca_pine.cjs               -> field verdict PINE (alasan/zona/MTF)
3. Terapkan GATE 9.3 berurutan (zona -> konfirmasi -> SL -> RR/jatah -> double-plan)
4. Cek posisi hidup: posisi.json + monitor_limit_xau.log (LIVE/TP/SL)
5. Jawab dengan format 9.5 (tabel TF, sweep/PD, peta level, verdict + rujukan MISS, sniper opsional)
6. Update posisi.json / entry_hari.json setiap event fill/SL/TP
7. **CHECK STATUS POSISI = kondisi + keselarasan strategi + aksi** (wajib, permintaan Fitra 28 Aug):
   bukan hanya floating/jarak TP-SL, tapi juga apakah posisi MASIH SEJALAN dengan aturan paten +
   `pengetahuan_fibo.md` (zona entry/invalidasi/scoring) + kondisi pasar terkini (trend/bias),
   lalu tutup dengan AKSI KONKRET (hold / geser SL / partial / cut / tunggu level apa).
   Posisi lama yang melanggar aturan saat dibuka = dikelola ketat, jangan dinormalisasi diam-diam.
```

*Dibuat 25 Aug 2026 oleh ox-alpha. Semoga profit selalu, Fitra.*
