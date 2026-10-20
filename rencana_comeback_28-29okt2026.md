# RENCANA COMEBACK — 28-29 OKTOBER 2026 (FOMC + PCE)

Dibuat: 20 Okt 2026, 12:0x WIB
Status saat dibuat: harga 4143.5, posisi lama BUY masih hidup (float +55 poin), PINE M15 FLAT, DXY 101.8 (79% range 120D1 = premium, bias DOWN = DIVERGING).

---

## 1. SNAPSHOT & KONTEKS

| Item | Nilai |
|---|---|
| Modal | Rp24.000.000 (Exness IDR, standard) |
| 2% risiko | Rp480.000 = $30 (kurs 16.000) |
| Jatah | 3 entry/hari, 2 loss = STOP |
| Posisi lama | BUY avg 4088.32, TP 4600, float +55 poin |
| Range aktif | 4100 - 4200 |
| DXY | 101.805, posisi 79% range 120D1 = USD premium |
| PINE | FLAT ready=0 (tidak ada izin entry) |

**Tesis besar:** emas turun dari 4184 ke 4143 (20 Okt). 4150 sudah ditembus = tesis hold lama tertekan. Struktur turun dari 5600 masih bisa dibaca sebagai flag bullish, TAPI butuh 4100/4073 bertahan. FOMC 28-29 Okt = penentu arah.

---

## 2. TIMELINE (WIB)

| Waktu | Event | Sikap |
|---|---|---|
| 20-27 Okt | Fed blackout, data minor | Range 4100-4200. Entry hanya kalau PINE ready=100 + CHoCH. Default NO ENTRY. |
| 28 Okt | FOMC hari-1 | Tidak ada statement. Jangan entry malam. |
| **29 Okt 01:00** | **Statement FOMC** | Stop 30 mnt sebelum-sesudah. |
| 29 Okt 01:30 | Press conference Powell | Boleh baca arah, jangan entry di tengah. |
| 29 Okt 19:30 | **US GDP Q3 + PCE** | Hindari entry 19:00-20:00. |
| 29 Okt 20:15 | ECB | Tambahan volatilitas. |
| 30 Okt | BoJ | Sesi Asia, hati-hati gap. |

Ekspektasi pasar: hold Okt ~83%, hike Des ~89-94% (hawkish hold). CPI 3.7%, PPI 6.3%.

---

## 3. ATURAN BESI (tidak bisa dinegosiasi)

1. **Gate paten 9.3**: zona (BUY diskon / SELL premium + D1 bearish) → PINE M15 ready=100 searah → CHoCH → SL struktural → RR min 1:3 → jatah tersisa.
2. **Event filter**: dilarang entry 30 menit sebelum/sesudah statement, PCE, GDP.
3. **Konfirmasi pasca-event**: tunggu **minimal 1 candle M15 close** setelah 01:00, baru cari CHoCH. Jangan tangkap pisau.
4. **DXY dicek dulu** setiap mau sinyal. DXY premium + DXY turun = belum izin BUY (belum diskon).
5. **Limit melenceng >40-50 poin dari harga = HAPUS**, jangan dibiarkan (MISS #5/#11).
6. **Double-plan**: satu terisi → cancel yang lain (jangan hedging).
7. **2 loss = tutup laptop**. Tidak ada "balas dendam".

---

## 4. UKURAN LOT (WAJIB — pakai tabel ini, bukan 0.1 lot)

Contract XAUUSD = **100 oz** (konfirmasi 7 Okt). Min lot 0.01 = 1 oz = **$1 per poin**.

| Lot | $/poin | SL 15 poin | SL 30 poin | SL 60 poin |
|---|---|---|---|---|
| 0.01 | $1 | $15 (1%) | **$30 (2%)** | $60 (4%) |
| 0.02 | $2 | $30 (2%) | $60 (4%) | $120 (8%) |
| 0.10 | $10 | $150 (10%) | $300 (20%) | $600 (40%) |

**Kesimpulan:**
- **1 layer 0.01 lot + SL maks 30 poin = 2%.** Ini batas aman akun sekarang.
- 2 layer (0.01 + 0.01) hanya boleh kalau **SL ≤15 poin** (total risiko 2%).
- Swing SL 60-135 poin **tidak mungkin** di 2% → jangan dipaksakan.
- **0.1 lot per layer (aturan lama) = 10x over-risk.** Jangan dipakai di akun Rp24jt (SL 30 poin = 20% akun).
- 2 loss × $30 = $60 = Rp960.000 = 4% → sesuai cap harian.

⚠️ Posisi lama tercatat **1.0 lot** di `posisi.json`. Di 100 oz itu butuh margin ~$4.000+ — tidak mungkin di akun $1.500. **Cek lot riil di MT5** sebelum menghitung apa pun. Jangan tambah lot.

---

## 5. SKENARIO

### A. BUY (prioritas) — hanya jika 4073-4100 bertahan
- **Zona**: 4073-4100 (low 14 Okt + angka bulat) atau 4085-4095 kalau sweep bawah terjadi.
- **Syarat**: sweep low → **CHoCH-B di M15** → **PINE M15 BUY ready=100** → candle body ≥0.45.
- **Entry**: limit di 38.2-50% retrace leg sweep (jangan chase).
- **SL**: 5-10 poin di bawah sweep low (bukan tepat di low — MISS #7/#8).
- **TP1** 1:3 (tutup layer), **TP2** 1:4 (runner). Setelah TP1 → SL ke BE.
- **Lot**: 0.01 (SL ≤30 poin) atau 2×0.01 kalau SL ≤15 poin.
- **Invalidasi**: close H1 < 4073 → batal, tunggu 4000.

### B. BUY pasca-FOMC dovish — hanya jika reclaim 4150
- Statement dovish + harga **close M15 > 4150** + DXY < 101.0.
- Entry: pullback 4130-4140 dengan CHoCH-B, bukan breakout chase.
- SL di bawah 4111 atau swing low terakhir + buffer.
- TP1 4185, TP2 4200 (RR minimal 1:3 dari entry).

### C. SELL — hanya jika D1 BEARISH + harga PREMIUM >4200
- Zona 4200-4215 (R1) atau 4242-4248 (MA100) kalau terjadi spike pasca-FOMC.
- Syarat: PINE M15 SELL ready=100 + CHoCH-S + D1 bearish.
- SL di atas 4248/4259 + buffer.
- TP1 4150, TP2 4110.
- Jangan SELL di 4140-4160 (tengah range, bukan premium, bukan diskon).

### D. NO TRADE (paling sering benar)
- Gap >20 poin, spread melebar, PINE FLAT, atau harga di tengah range 4130-4180 → **diam**.
- Kalau 4000 pecah dengan close D1 < 4000 → stand aside sampai stabil (support berikut 3829).

---

## 6. LEVEL KUNCI

| Tipe | Level |
|---|---|
| R3 | 4259.6 |
| R2 | 4242-4248 (MA100) |
| R1 | 4200 |
| Mid range | 4157 |
| S1 | 4132 / 4111 |
| S2 | **4100** (pertahanan utama) |
| S3 | **4073** (low 14 Okt) |
| S4 | 4000 (psikologis) |
| S5 | 3829 |

DXY: 101.8 sekarang. **< 100.5** = angin BUY emas. **> 102.5** = tekanan SELL emas.

---

## 7. CHECKLIST SEBELUM KLIK (5/5 wajib)

- [ ] DXY sudah dicek (`usdxau_correlation.cjs`) — arah + posisi range
- [ ] Zona benar (BUY diskon / SELL premium + D1 bearish)
- [ ] PINE M15 `ready=100` searah + CHoCH terlihat
- [ ] Lot ≤0.01 (atau 2×0.01 hanya jika SL ≤15 poin) + SL struktural
- [ ] RR ≥1:3, jatah tersisa ≥1, loss hari ini <2

Kalau ada satu yang gagal → **NO ENTRY**.

---

## 8. POSISI LAMA (BUY avg 4088.32)

| Kondisi | Aksi |
|---|---|
| Harga >4100 dan D1 tidak close <4073 | Hold, jangan tambah lot |
| Close H1 < 4100 | Kurangi / tutup (invalidasi) |
| Close D1 < 4073 | Tutup total, jangan harap 4600 |
| Rally >4200 pasca-FOMC | Pertimbangkan partial di 4200, sisanya trail |
| SL 4058 | **Jangan dipasang** (stop-out ~4070) |

---

## 9. RUTINITAS HARIAN

1. Pagi: `node C:\HEBAT\analisa_gabungan.cjs` → baca verdict
2. `node C:\HEBAT\usdxau_correlation.cjs` (DXY dulu, tunggu selesai — jangan bareng warm-up)
3. Cek `posisi.json` + `monitor_limit_xau.log` (tail 20)
4. Update `entry_hari.json` tiap tanggal ganti (jatah 3, loss 0)
5. Malam 28-29 Okt: monitor nyala, overlay aktif, tidak entry sebelum candle M15 pasca-statement

---

## 10. LARANGAN (rujukan MISS)

- Jangan entry tanpa PINE ready=100 + CHoCH (MISS #9/#10/#12)
- Jangan BUY di premium (MISS #6/#11)
- Jangan SL tepat di tepi swing obvious (MISS #7/#8)
- Jangan tahan limit yang sudah melenceng (MISS #5/#11)
- Jangan tambah lot untuk "menyelamatkan" posisi
- Jangan pakai 0.1 lot di akun ini
- Jangan entry di 30 menit sekitar FOMC/PCE
