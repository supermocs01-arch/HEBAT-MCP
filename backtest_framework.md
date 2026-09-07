# BACKTEST FRAMEWORK — SMC SWING (XAUUSD) | 13 AGU 2026

Kerangka pengujian kuantitatif untuk memvalidasi siklus likuiditas:
sapuan eksternal → zona diskon/premium → FVG terisi → TP parsial + target internal.

## 1. TUJUAN
Membuktikan dengan data (bukan keyakinan):
- Berapa % sapuan swing eksternal diikuti pergerakan arah berlawanan >= 30 pips?
- Berapa % FVG terisi ulang & bereaksi, vs diterobos tanpa reaksi?
- Apakah filter zona diskon/premium benar-benar menaikkan win rate & profit factor?
- Apakah TP parsial 2:1 + sisa trailing lebih baik dari sisa dibiarkan diam?

## 2. MATRIKS SIMULASI (parameter yang diuji)
| Parameter | Nilai diuji |
|---|---|
| TF sapuan | D1 (satu-satunya sesuai aturan) |
| TF eksekusi | H1, H4 |
| Formasi 3 lilin (sumbu tengah) | threshold wick: 0.4x / 0.6x / 0.8x ATR TF |
| Deteksi FVG | lebar min: 0.3x / 0.5x ATR, max 25 bar usia |
| Konfluensi | FVG saja / FVG+OB / FVG+OB+breaker |
| Split zona diskon/premium | 45/55, 50/50, 55/45, adaptif-ATR |
| Buffer limit | 0 (tepat), 0.2x, 0.5x ATR M15 |
| SL | struktur saja / struktur + 0.3x ATR M15 / cap 20 pips |
| TP parsial | 1R, 1.5R, 2R |
| Sisa posisi | diam / breakeven / trailing 2R->3R->4R |
| Filter acara | tanpa / berita 30/60 menit diblokir |

Catatan: setiap kombinasi = 1 baris hasil; total kombinasi ~3x2x3x3x4x3x3x3x3x2 = 34.992
-> jalankan grid search bertahap: fix dulu baseline terbaik, lalu uji 1 variabel sekali (one-at-a-time).

## 3. DATA HISTORIS
- XAUUSD, 3-5 tahun, M15 - D1 (master M15, agregasi 1:N ke H1/H4/D1)
- Termasuk periode: bullish (2024-2025), bearish (2022), sideways (2023)
- Kalender berita makro (CPI/PPI/NFP/FOMC) sebagai dataset filter acara

## 4. KRITERIA KEBERHASILAN PER TRADE
- TP parsial tercapai? (ya/tidak, waktu ke-)
- Target internal harian tercapai? (ya/tidak)
- Hasil akhir posisi: +R penuh / +R parsial / breakeven / -1R
- SL tersentuh sebelum TP1? (ya/tidak)
- Limit tidak terisi (missed entry)? (ya/tidak)

## 5. METRIK STATISTIK
- Win rate TP parsial & TP penuh
- PROFIT FACTOR = sum(win) / sum(loss)
- EXPECTANCY per trade (dalam R)
- Max drawdown (%)
- Jumlah trade/tahun (deteksi overtrading)
- Rasio missed entry vs setup valid (efisiensi limit)
- % false sweep (sapuan yang tidak diikuti FVG terisi)

## 6. ARSITEKTUR DATA (TANPA KODE EKSEKSI)
```
dataset/
  raw/
    XAUUSD_M15.csv        (ts, o, h, l, c, v) - sumber master
    calendar.csv          (dt, event, impact) - filter acara
  labels/                 (dihasilkan, satu file per siklus)
    sweeps.csv            (ts, level, tipe, hasil_lanjut)
    fvgs.csv              (ts, lo, hi, tipe, usia, konfluensi)
    cycles.csv            (ts_sapuan, range, mid, split, zona_bias)
  trades/
    trades.csv            (ts, arah, entry, sl, tp1, tp2, hasil_R, kategori)
  results/
    grid_results.csv      (kombinasi parameter -> semua metrik)
```
- Relasi: sweeps 1:N fvgs (FVG dalam rentang pasca-sapuan), cycles 1:N trades
- Semua file keyed oleh timestamp UTC; tidak ada data masa depan di bar yang sama

## 7. SKEMA BACKTEST & VALIDASI
- Event-driven: setiap sapuan = 1 siklus baru; keputusan hanya pakai bar yang SUDAH TUTUP
- Walk-forward: train 60% -> test 40% (rolling window, 6 bulan maju per iterasi)
- Out-of-sample wajib; cek per fase pasar (bull/bear/sideways) terpisah
- Larangan: lookahead bias, peeking FVG yang belum terbentuk, SL/TP di bar yang sama
- Kriteria lolos produksi: PF >= 1.4, expectancy > 0.25R, max DD < 30%,
  dan hasil test-set tidak lebih buruk 20% dari train-set (anti overfit)

## 8. VALIDASI MANUAL (sebelum otomasi penuh)
- Rekam 20-30 trade nyata di akun cent ($12) dengan formula & filter ini
- Bandingkan win rate nyata vs backtest -> kalibrasi parameter
- Jangan ubah aturan di tengah periode uji (minimum 1 bulan konsisten)

## 9. ATURAN DISIPLIN TETAP
- Quota 1-3 entry/hari, 2 loss = stop, reset 07:00 WIB
- Zona bekas tidak dipakai ulang | Berita 30/60 menit = filter
- Backtest = alat kalibrasi, BUKAN jaminan masa depan