# PEMBUKUAN 21 NOVEMBER 2026

> Dibuat 20 Okt 2026 23:37 WIB. Semua angka diisi saat review 21 Nov, jangan dikira-kira.

## Konteks
- Akun uji: **DEMO** `414469397` Exness-MT5Trial6 (IDR, saldo awal 2.500.000).
- Bridge MT5 mode **shadow** (read-only) aktif; trade test buy+close sudah lolos.
- Akun real (Rp24.000.000) TIDAK terhubung ke bridge saat uji ini.

## Limit yang dipasang (DEMO)
| Layer | Ticket | Arah | Entry | SL | TP | Lot | Risk | Status 21 Nov |
|---|---|---|---|---|---|---|---|---|
| L1 | 5289061981 | SELL | 4145.0 | 4161.0 | 4097.0 | 0.01 | $16.0 | |
| L2 | 5289064352 | SELL | 4150.5 | 4161.0 | 4073.5 | 0.01 | $10.5 | |

Total risk jika dua-duanya kena: **$26.5 (1.8% modal real $1.500)**.

## Kolom yang WAJIB diisi saat review
| Item | L1 | L2 |
|---|---|---|
| Waktu order dibuat | 20 Okt 23:30 | 20 Okt 23:31 |
| Waktu fill (atau "tidak kena") | | |
| Harga fill vs limit (slip) | | |
| PINE saat fill (sig/ready) | | |
| CHoCH saat fill (ada/tidak) | | |
| Hasil (TP / SL / expire / manual) | | |
| P/L (IDR & USD) | | |
| R multiple (hasil / risk) | | |
| MFE (poin maksimal searah) | | |
| MAE (poin maksimal lawan) | | |

## Evaluasi ketepatan waktu (inti review)
Skor per layer: **TEPAT / TERLALU CEPAT / TERLAMBAT**
- Terlalu cepat = entry sebelum CHoCH/PINE searah (lihat MISS #9/#10/#12).
- Terlambat = harga sudah lewat zona > `max_chase_poin` (4 poin / ~0.45 ATR) baru entry.
- Tepat = entry di dalam zona DAN konfirmasi ada, atau limit terisi tanpa chase.

| Pertanyaan | Jawaban |
|---|---|
| Apakah limit terisi tanpa perlu chase? | |
| Apakah PINE M15 searah saat fill? | |
| Kalau tidak searah, berapa lama sampai searah? | |
| Apakah TP1 tercapai sebelum struktur berubah? | |
| Apakah SL L2 sudah digeser ke BE setelah TP1? | |
| Kesalahan timing yang terulang? | |

## Aturan timing yang dipakai (jangan diubah tanpa alasan)
1. **Retest / pullback** -> LIMIT (harga datang ke zona). Contoh: SELL 4145/4150.5.
2. **Breakout / continuation** -> STOP, bukan limit. Contoh alternatif: SELL STOP di bawah 4112.7 setelah CHoCH-S M15.
3. Jangan market-chase: kalau jarak ke zona > 4 poin (0.45 ATR M15), tunggu retest baru.
4. Batal otomatis jika: M15 close di atas 4161 (invalidasi), atau lewat `expire_at` 21 Okt 04:00 WIB.
5. Konfirmasi wajib saat harga masuk zona: PINE M15 searah + CHoCH close + candle tegas.
6. Setelah L1 TP: SL L2 ke BE. Tidak boleh tambah layer ke-3.

## Hasil trade test koneksi (bukan strategi)
| Waktu | Aksi | Harga | Lot | Hasil |
|---|---|---|---|---|
| 20 Okt 23:22 | BUY market + close | 4123.513 -> 4123.666 | 0.01 | +Rp2.873 (+$0.18) |

## Keputusan yang harus diambil 21 Nov
- [ ] Lanjut format 2 layer untuk swing, atau balik 1 layer + runner?
- [ ] Apakah `max_chase_poin` 4 poin terlalu ketat / longgar?
- [ ] Apakah TP2 4073.5 realistis atau perlu TP parsial di 4097/4085?
- [ ] Apakah bridge shadow sudah cukup akurat untuk naik ke mode `warn`?
- [ ] Jadwalkan audit penuh sistem (sesuai rencana pertengahan November).
