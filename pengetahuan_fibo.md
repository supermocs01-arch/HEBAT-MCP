# PENGETAHUAN FIBO — ZONA KONFLUENSI & TOLERANSI TERUKUR

> Sumber: pembelajaran Fitra 28 Aug 2026 (data leg real XAUUSD).
> Status: WAJIB DIPAKAI semua AI penerus saat membaca FIBO. Melengkapi Modul 6 PINE (FIBO) + Gate 9.3.

## 1. DATA LEG ASLI (contoh terverifikasi)
Leg BEARISH: 0% = 4,698.920 (high) → 100% = 4,452.528 (low), range = 246.392 pts.

| Level | Harga | Peran operasional |
|-------|-------|-------------------|
| -27% EXT | 4,765.446 | **Runner only** — EXT jarang kena (lihat pelajaran EXT) |
| 0% | 4,698.920 | High leg — sumber sweep buy-side |
| 38.2% | 4,604.798 | Target natural 1 (rejection level) |
| 50% | 4,575.724 | Mid leg — test pertama saat bounce |
| 61.8% | 4,546.652 | **Zona demand / entry BUY (golden pocket atas)** |
| 65% | 4,538.770 | **Batas bawah golden pocket** (61.8–65% = zona entry) |
| 78.6% | 4,505.258 | **Invalidasi** — body close di bawah sini = bias beli batal |
| 100% | 4,452.528 | Low leg — likuiditas sell-side berikutnya |

Bukti lapangan 26–28 Aug: demand 4,545 (61.8%) bertahan 2x, TP1 4605 = persis 38.2%,
SL wajar 4,505 = persis 78.6% − di bawah OB D1 4509. Leg ini yang dipakai contoh.

## 2. ATURAN INTI (ringkas —AI wajib ikuti)

1. **ENTRY = ZONA, BUKAN GARIS.** Zona entry BUY = golden pocket **61.8% s/d 65%**
   (atas = f618, bawah = f50-nya 65% retrace). Jangan taruh limit tepat di satu angka.
2. **Toleransi = fungsi volatilitas.** Lebar zona = max(0.5 × ATR TF-entry, 1% range leg).
   Contoh: ATR D1 94.1 → toleransi dinamis ±9.4 pts di sekitar f618.
3. **INVALIDASI TERUKUR:** bias beli GAGAL hanya jika **body close** (M15/H1, bukan wick)
   di bawah **78.6% − buffer 2 pts**. Wick tembus TIDAK dihitung gagal — itu sweep.
4. **Konfirmasi penolakan VALID** (minimal candle + struktur bersama):
   - Hammer/pin bar body-ratio ≥ 0.45 dengan close di atas zona atas (parameter BodyRatio PINE)
   - Bullish engulfing di dalam zona
   - Sweep → reclaim: wick di bawah zona, close balik di dalam, candle berikut lanjut
   - **CHoCH-B M15** (wajib sesuai MISS #12)
   - RSI divergence bullish (harga LL, RSI HL)
5. **Sinyal GAGAL (batal BUY):**
   - Body close M15/H1 di bawah batas bawah zona (warning)
   - Body close di bawah 78.6% − buffer (GAGAL resmi)
   - Retest zona dari bawah ditolak (zona jadi resistance)
   - CHoCH-S + BOS-S beruntun setelah sentuh zona (struktur flip)
6. **SCORING KONFLUENSI** (pakai ini, bukan feeling):
   - FIBO 61.8–65% (1) + OB/FVG searah (1) + harga di DISKON/mid-range (1)
   - + sweep-reclaim baru terjadi (1) + CHoCH searah (1)
   - **5 = VALID | 3–4 = AGRESIF (catat, kelola ketat) | <3 = NO ENTRY**
7. **FIBO digambar ulang tiap leg baru.** Level leg kemarin bukan level hari ini.
8. **SELL kebalikannya simetris**: zona entry = retest 14.5–25% (sudah ada di PINE/MSNR),
   invalidasi = body close di atas 38.2% + buffer untuk leg bearish.

## 3. KELEMAHAN LEVEL STATIS (kenapa zona)
- ATR XAU D1 bisa 90+ pts: noise normal menembus satu garis tanpa makna.
- Spread + slippage + tick hunting membuat "kena level" ambigu.
- Garis tunggal yang obvious = magnet likuiditas (MISS #7/#8) — sweep justru bahan bakar
  jika dibaca sebagai zona dengan SL di luarnya.
- Level statis buta sesi: sentuhan Asian (vol rendah) vs NY (vol tinggi) bobotnya beda.

## 4. LEVEL PRESISI vs ZONA TOLERANSI (kesimpulan)
| | Level Presisi | Zona Toleransi |
|---|---|---|
| Presisi entry | Tinggi di teori | Sedikit lebih dalam, masih dalam RR |
| Tahan noise/spread | Rapuh | Kebal |
| Sweep hunt | Magnet (bahaya) | SL di luar zona = aman |
| Deteksi gagal | Ambigu (wick?) | Jelas (body close di luar zona) |
| Volume peluang | 1 harga | 8+ pts area |

**Vonis: zona menang.** Level presisi hanya anchor untuk MENGHITUNG zona — bukan tempat order.

## 5. DOKUMEN TERKAIT
- `AGENTS.md` §9.3 Gate entry + §10.1 Modul 6 (FIBO per TF) & Modul 7 (MSNR M30)
- `pelajaran_sl.md` MISS #7/#8 (SL struktural), #12 (konfirmasi wajib)
- PINE `smc_swing_paten_v2.pine` Modul 5 (FIBO: demandZona = 61.8–78.6) —
  penyempurnaan v2.3 (plot golden pocket + toleransi ATR + scoring) PENDING deploy.

*Dibuat 28 Aug 2026 dari pembelajaran Fitra — diterapkan pada leg 4698.9→4452.5.*
