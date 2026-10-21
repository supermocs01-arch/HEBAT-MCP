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

## Hasil aktual (diisi 21 Okt 08:50 WIB)
| Item | L1 | L2 |
|---|---|---|
| Waktu order dibuat | 20 Okt 23:30 | 20 Okt 23:31 |
| Waktu fill | **tidak kena** | **tidak kena** |
| Harga fill vs limit | - | - |
| PINE saat fill | FLAT (ready 0) | FLAT (ready 0) |
| CHoCH saat fill | tidak ada | tidak ada |
| Hasil | **EXPIRED / dibatalkan** | **EXPIRED / dibatalkan** |
| P/L | 0 | 0 |
| R multiple | 0 | 0 |
| MFE | ~0 (harga tidak pernah naik ke zona) | ~0 |
| MAE | - | - |

**Skor timing: TERLAMBAT / EXPIRED** — limit dipasang tanpa konfirmasi, harga justru turun 28–34 poin dari zona. Aturan `maxChase` 4 poin + `expire_at` 04:00 WIB mencegah chase. **Tidak ada loss.**

Pelajaran: limit retest tanpa momentum/konfirmasi = uang menganggur. Untuk setup bearish, zona jual harus menyesuaikan struktur terbaru (M30 retest turun ke 4128.6–4130), bukan zona lama 4145.


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


## Hasil 21 Okt 2026 — SELL STOP breakdown 4112 / 4111 (MISS #16)
| Item | Nilai |
|---|---|
| Jenis | 2 layer SELL STOP 0.01 (L1 4111.93 TP 4073.5, L2 4110.95 TP 4040) |
| Risk terpasang | $24.12 (1.61% dari $1.500) setelah SL diperketat 4126.5 -> 4123.5 |
| Fill | 13:53-13:54 WIB |
| Hasil | **SL 4123.5 @14:26 WIB = -$27.2** (equity demo Rp2.503.198 -> Rp2.067.944) |
| Konfirmasi saat entry | PINE FLAT ready=0 semua TF, CHoCH tidak ada (MISS #16) |
| Skor timing | TERLAMBAT secara struktur: breakdown = sweep-the-sweep, harga balik +12 poin |
| Pelajaran | Stop order breakdown tanpa PINE SELL + CHoCH = dilarang; konflik DXY = veto; jangan perketat SL ke dalam OB |
| Jatah | loss 1 dari 2; sisa jatah hari ini 2 -> STOP TOTAL kalau loss ke-2 |


## 21 Okt 21:00 WIB — Evaluasi posisi premium (HOLD, tanpa aksi baru)
| Item | Nilai |
|---|---|
| Harga | 4132,0 (PREMIUM, di atas mid 4114,6) |
| Trend 4TF | D1/H4 BEAR, H1 BULL, M15 BEAR (bentur) |
| PINE | FLAT ready=0 semua TF, RSI 46-54, tanpa CHoCH |
| Posisi | L1 4136 +8.4 poin / L2 4141 +9.2 poin (floating hijau, sebelumnya sempat +11.7) |
| Keputusan | HOLD - SL 4148.5 tidak diubah, TP 4096/4041 jalan, guardian kunci 4071 aktif |
| Rasional | Sell searah D1 bear + zona premium + sweep buy-side; momen jangka pendek masih BULL => hanya pantau batas: M15 close > 4141.4 = waspada, > 4148.5 = SL |
