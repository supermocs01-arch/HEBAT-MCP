# PATEN TRADING SMC+PINE (XAUUSD) — WAJIB HAFAL

## KOMANDO (protokol)
- **"hi fitra"** = siap pagi / cek koneksi TV Desktop (port 9222). Kalau TV mati: jalankan `start_tv.cmd`.
- **"scan"** = jalankan `analisa_gabungan.cjs` (analisa gabungan PINE + analyzer, MTF: D1, H4, H1, M15, + breaker block + OB terbaru).
- **"entry"** = pasang monitor `monitor_entry.cjs` setelah setup valid.
- TradingView WAJIB lewat **Desktop** (`start_tv.cmd`), BUKAN Chrome.

## OVERLAY OTOMATIS (PATEN — jangan diubah)
- **SETIAP scan = limit langsung tampil di overlay chart** tanpa perintah tambahan.
- Alur baku: scan → hitung plan (zona + SL/TP paten) → tulis `overlay_plan.json` → **auto-run `overlay_entry.cjs`** → limit (title/entry/SL/TP/syarat/status) tampil di pojok kanan atas chart.
- Prioritas tampilan: **`posisi.json` (posisi terbuka) > `overlay_plan.json` (plan scan)**.
- Kalau scan tidak menemukan zona valid: overlay tetap terpasang dengan status TUNGGU/NO ENTRY (tidak pernah kosong).
- Zona bekas (kena-batal hari ini): overlay menampilkan "ZONA BEKAS" — JANGAN eksekusi/dipasang ulang.
- Manual override hanya lewat file JSON — jangan edit overlay lewat UI chart.

## SYARAT ENTRY (SEMUA harus penuh, tidak ada toleransi)
1. Limit kena zona (order block / FVG / breaker) di TF konfluensi.
2. **PINE M15 = BUY/SELL** (bukan FLAT).
3. **BOS-B/BOS-S H4 baru** (struktur break di H4).
4. Candle tegas (body >= 45%, ekor <= 45%).
5. **Filter D1**: D1 harus SEARAH dengan H4. Kalau bentur: JANGAN entry paksa, tunggu.
6. Trend 4TF searah (D1/H4/H1/M15) = kualitas terbaik.

## ROADMAP SALDO (KEPUTUSAN FINAL — 10 AGU 2026)
**Mulai: $12 (1,200 USC) — akun cent Exness, leverage 1:2000, spread 0.3 pips. 0.05×2 layer TIDAK MUAT MARGIN di $12 (butuh $21.75).**
**SL/TP SAMA DI SEMUA TIER (paten): SL struktural maks 20 pips | TP1 30–40+ pips | TP2 40+ pips.**

| Saldo | Lot | Risk/trade |
|---|---|---|
| $12–120 (SURVIVAL) | **0.01, 1 entry** | ±35% (AGRESIF) |
| $120–600 | 0.02–0.03 | 12–25% |
| **$600+** | **0.05×2 layer** | 25% → 5% di $3,000 |

**Target: $12 → $120 → naik lot bertahap → 0.05×2 di $600.**

## SL/TP PATEN (XAUUSD) — 1 pips = 1.0 harga (KEPUTUSAN USER: 10 AGU 2026)
- **SL = STRUKTURAL, MAKS 20 PIPS** (di bawah zona/min 10 pips — mentok 20 pips tidak apa).
- **TP1 = 30 PIPS (1:3)** — target utama; 40+ pips juga tidak apa.
- **TP2 = 40+ PIPS (1:4)** — situasional (trend 4TF searah / konfluensi kuat). Jika kondisi lemah: tutup di TP1.
- Aturan jalan: paten ini dipakai otomatis oleh scan (SL/TP dihitung struktural, dikunci 10–20 / 30–40+).

## DISIPLIN
- Tidak ada sinyal = tidak ada trade. Tidak memaksa.
- **Entry maksimal 2-3x per hari.** Habis 3x (kena SL berulang): STOP, evaluasi, jangan lanjut.
- SELL hanya jika CHoCH-S + PINE M15 SELL + BOS-S H4 baru (jangan asal fade trend D1).
- Konfirmasi dulu sebelum eksekusi manual.
- Sniper entry TIDAK dipakai (cukup informatif, jangan jadi pemicu).
- SEMUA trade dicatat ke log untuk membuktikan win rate 78% (bukan perasaan).

## DISIPLIN BESAR (KEPUTUSAN FINAL — 13 AGU 2026, pelajaran SMC termutakhir)
- **Likuiditas bukan target ritel**: sapuan = penyerapan volume acak/efek samping order institusi. Jangan bangun entry HANYA dari sapuan — butuh konfirmasi struktur + tekanan.
- **Penembusan WAJIB close**: BOS/CHoCH hanya valid jika BODY menembus level, bukan ekor/wick (35-55% false break kalau pakai wick).
- **FVG bukan jaminan**: 30-45% FVG tidak terisi ulang, 20-35% diterobos tanpa reaksi. FVG valid = irisan OB/breaker + usia muda + searah pantulan historis.
- **Fibonacci 61.8 = filter prioritas**, bukan entry sendirian. Hanya kombinasi 61.8 ∩ FVG ∩ OB yang layak.
- **Risk 1% diesuaikan volatilitas**: SL struktur + buffer, risk-nya diset agar 1% dari modal — bukan lot tetap.
- **Breakeven TIDAK terlalu dini**: geser SL ke entry hanya setelah profit ≥ 1R (atau 20 pips paten). Breakeven prematur mencuri trade pada 40-60% kasus.
- **Confluence berlapis**: entry hanya di irisan minimal 2 dari OB/S&D, FVG, breaker, 61.8, retest swing. Zona bekas selalu skip.
- **Filter acara**: berita terjadwal (30/60 menit sebelum-sesudah) membatalkan setup. Sapuan jelang CPI = panic, bukan likuiditas.
- **Logging semua zona**: waktu, alasan, konfluensi dipakai — bukti mana lapisan yang benar memberi edge.

## MATRIKS PROBABILITAS CHoCH (ASLI vs KOREKSI — 13 AGU 2026)
| Parameter | Koreksi sementara (TUNGGU) | CHoCH asli (SIAP eksekusi) |
|---|---|---|
| TF sinkron | hanya M15 | ≥ 2 TF (M15 + H1) |
| Jarak penembusan | sentuh swing, tak bertahan | close solid + toleransi ATR |
| Volatilitas break | normal/rendah | ekspansi + body ≥ 45% |
| Posisi harga | di zona diskon/bias | di zona premium/lawan bias |
| Swing penahan H4 | belum disentuh | tersentuh/tertembus |
| PINE M15 | FLAT/lemah | SELL/BUY tegas |
| Berita dekat | (sinyal batal) | (sinyal batal) |

Skor: **≥ 5/7 = CHoCH asli → LAYAK eksekusi | 4/7 = ZONA ABU-ABU → LAYAK HANYA jika eksekusi di zona valid (premium/diskon benar) + SL ≤ 15 pips | ≤ 3/7 = koreksi → TUNGGU.** Jangan over-filter sampai mematikan semua entry — skor 4 yang zona-nya benar tetap boleh dieksekusi (sedikit agresif, tapi tetap terfilter).

## URUTAN PENYARINGAN (DETEKSI → EKSEKUSI — 13 AGU 2026)
1. **D1 dulu** (bias besar, BUY_BOS/CHoCH) → H4 (struktur utama) → H1 → M15 (eksekusi).
2. **Validasi penembusan**: BOS/CHoCH → cek close + body melewati level + toleransi 0.3-0.5×ATR TF. Gagal = buang.
3. **Filter momentum**: candle konfirmasi (body ≥ 45%, ekor ≤ 45%) + RSI M15 berpihak (bukan ekstrem).
4. **Filter struktural besar**: posisi zona premium/diskon benar + D1/H4 searah (tidak bentur).
5. **Filter sinkronisasi TF**: CHoCH M15 + konfirmasi H1 (bukan M15 sendiri).
6. **Filter acara**: tidak ada berita 30/60 menit.
7. **Eksekusi**: limit di zona (FVG/OB/breaker), SL struktur ≤ 20 pips, TP 1:3/1:4; atau tunggu retest jika penembusan jauh dari zona.
8. **Post-entry**: breakeven hanya setelah ≥ 1R; trailing 2R→3R→4R. Kejar sampai TP2/trailing penuh — cut kecil kalah 1R, menang besar 3-4R.

## FIBONACCI PADA SISTEM (13 AGU 2026 — pelajaran swing 1000 pips)
- **Level dipakai**: 38.2 / 50 / 61.8 / 78.6, ditarik otomatis dari leg swing terakhir per TF (D1 → M15) — tidak manual di chart.
- **61.8 = filter prioritas**, bukan entry sendirian. Entry hanya di irisan zona (OB/FVG) dengan 61.8/50.
- **50% = magnet sapuan (self-fulfilling)**: level paling ditonton → stop museum di sana. SWEEP di 50 lalu lanjut ke 61.8 itu pola biasa — validasi sapuan dulu, jangan blind order di 50.
- **Konfluen**: zona OB/FVG yang memuat level 50/61.8/78.6 = **ZONA KUAT** (prioritas limit).
- **Posisi harga vs fib**: di atas 61.8 leg UP = diskon dalam (layak BUY di zona); di bawah 38.2 = premium (layak SELL).
- **TP FIBO (KEPUTUSAN FINAL — 13 AGU 2026)**: TP1 SELALU RR 1:3 (paten, tidak pakai level fibo). TP2 sesuai level fibonaci SWING saja — ekstensi 127.2/161.8/261.8. Level retracement (38.2/50/61.8/78.6) TIDAK dipakai untuk TP.
- **KONVENSI PIP MT5 (13 AGU 2026)**: 1 pip = 1.0 harga XAU. SL 10 pips = 10.0 harga (maks 20 = 20.0), TP1 1:3 = 30.0, TP2 1:4 = 40.0+. JANGAN pakai skala 0.1 (hitung.cjs "pips" beda — konversi manual: hitung.cjs pips /10 = pips MT5).

## PELAJARAN SWING 1000+ PIPS (13 AGU 2026 — analisis kritis 2 strategi)
- **Garis tren manual = subjektif & rawan false break** (35-55%): GANTI dengan BOS/CHoCH close+body + toleransi 0.3-0.5×ATR (sudah di sistem).
- **Jangan abaikan bentuk pola**: harga bisa sideways/berbalik tanpa menembus garis → wajib struktur + zona, bukan "garis aman".
- **Risk harus mengikuti volatilitas**: jarak SL berubah → hitung di `hitung.cjs`, SL struktural max 20 pips.
- **"Abaikan trader lain" butuh pengganti objektif**: filter berita 30/60 menit + cut wajib (CPI/NFP/FOMC).
- **EMA 50 hanya filter rezim arah**, bukan pemicu (lag: sinyal muncul saat harga sudah jauh → R:R buruk).
- **3 lilin merah = entry telat** (masuk di akhir pullback): ganti dengan limit di zona OB/FVG/61.8 — sudah sistem kita.
- **Konfirmasi 1 lilin = telat & R:R memburuk**: pakai pending limit di zona, bukan market order.
- **Pialang bebas biaya inap**: Exness cent sesuai untuk swing hold berhari-hari (TP2 berbasis swing H4/D1).
- **Esensi 1000 pips**: tahan posisi sampai struktur besar (H4/D1) tercapai — cut kecil 1R, menang besar 3-4R.

## ATURAN MANAJEMEN POSISI (WAJIB — 11 AGU 2026)
1. **SL 10 pips wajib dipegang** — tidak boleh dipindah/dilebarkan. Kena = cut, jangan dendam, jangan re-entry.
2. **TP1 30 pips** = take minimal, tutup dulu. Jangan tunggu TP2 kalau belum yakin.
3. **TP2 40 pips** = bonus, hanya kalau posisi sudah aman di breakeven.4. **Breakeven rule**: begitu profit 20 pips, geser SL ke entry → risiko nol, biarkan jalan ke TP1/TP2.
5. **Cut sebelum berita besar** (CPI/PPI/NFP/FOMC): posisi yang masih terbuka WAJIB ditutup manual sebelum rilis. Tidak ada alasan — berita = spekulasi, bukan trading.
6. **1–3 entry/hari, 2 loss = stop**: total risiko dihitung dari semua posisi yang dibuka.
7. **TIDAK averaging** (menambah ke posisi rugi) dan **TIDAK chasing** (menambah ke posisi sudah profit besar).
8. Posisi counter-trend (sell saat bullish kuat) = posisi sementara; rencana utama tetap buy di zona valid.
9. **JENIS POSISI (RULE 14 AGU — dari miss TP terlalu cepat):**
   - **SWING JAUH** (entry di zona diskon dalam, konfluen ganda 61.8∩FVG, fraktal swing H4): TP1 kena → **JANGAN full close** — geser SL ke entry, sisakan runner ke TP2 FIBO (EXT 127.2/161.8/261.8), trailing 2R→3R→4R.
   - **SCALP** (zona tunggal/tengah): TP1 full close, sesuai paten (no.2).
   - Identifikasi jenis posisi SEBELUM eksekusi, bukan sesudah.

## PELAJARAN DARI SL HIT #1 (13 AGU 2026 — BUY LIMIT 4336.7 kena SL)
- Kenapa terhit: entry di PINGGIR zona (tepat di mid 4336.7, bukan diskon dalam) + konflik D1/H4 SUDAH aktif saat plan dipasang + menangkap pisau (tidak ada satu tanda balik) + SL 10 kaku di zona pinggir.
- **NO TRADE ZONE = NO PLAN**: kalau D1 vs H4 bentur, JANGAN buat/pasang plan limit — status TUNGGU saja, tanpa angka limit.
- **BUY hanya di DISKON DALAM** (harga < mid dengan jarak aman, ideal zona 50-61.8) — TIDAK PERNAH di batas/pinggir mid.
- **Jangan nembak momentum**: limit buy hanya jika (a) zona konfluen kuat dalam, DAN (b) ada tanda balik (CHoCH-B / PINE BUY / candle tegas) — atau harga sudah DI zona, bukan masih jauh di atasnya sambil turun.
- **SL struktural**: SL di bawah zona konfluen (FVG/OB dasar); kaku 10 pips hanya untuk entry di TENGAH zona kuat, bukan pinggir.
- **Limit terisi ≠ valid**: setiap limit terhit, validasi ulang 3 syarat (CHoCH + PINE + zona benar) sebelum eksekusi.
- **Prioritas zona buy**: 61.8 ∩ FVG > 50% ∩ OB > 38.2 — jangan turun kualitas demi "lebih dekat".
- Detail lengkap + log training: `C:\HEBAT\pelajaran_sl.md`

## FILE PENTING
- `C:\HEBAT\start_tv.cmd` — launcher TV Desktop (paten).
- `C:\HEBAT\analisa_gabungan.cjs` — scan gabungan (PINE + analyzer + D1).
- `C:\HEBAT\overlay_entry.cjs` — overlay rencana entry di chart.
- `C:\HEBAT\monitor_entry.cjs` — monitor entry (pasang saat "entry").
