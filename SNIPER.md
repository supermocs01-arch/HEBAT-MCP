# SNIPER ENTRY (PELAJARAN ANDRA RIZKY - DIKRITISI & DISESUAIKAN PATEN)

## PRINSIP
Sniper entry = ambil harga di zona kunci dengan SL kecil & RR jelas, menunggu tekanan harga
(konfirmasi), bukan menebak arah. Berikut adaptasinya ke paten kita (XAUUSD, akun cent):

## 1. IDENTIFIKASI AREA KUNCI
- S&R = ZONA (range), bukan garis tunggal. Tarik dari titik pantulan terbanyak, bukan titik terjauh.
- Supply/Demand = zona dari area wick, tapi batas eksekusi pakai BODY zone (wick = kotor, rawan stop hunt).
- Trendline/pola lanjutan wajib H1 (flag setelah rally = continuation).

## 2. TEKANAN HARGA (PRICE ACTION) - syarat eksekusi
- BUY PRESSURE: turun ke zona demand, lilin merah ekor bawah panjang didorong kuat ke atas,
  DIKUTI lilin hijau -> sinyal Buy.
- SELL PRESSURE: naik ke zona supply, lilin ekor atas panjang didorong kuat ke bawah,
  DIKUTI lilin merah -> sinyal Sell.
- Di scan kita: gunakan candle= (body>=45%, ekor<=45%) + PINE M15 sebagai pembaca tekanan.

## 3. PARAMETER (KEPUTUSAN FINAL - DISESUAIKAN PATEN)
- SL = STRUKTUR zona + buffer 0.3-0.5x ATR M15, CAP MAKS 20 PIPS (paten). SL fix 30/60 =
  DITOLAK (struktur zona kalah oleh noise/likuiditas).
- RR minimal 1:3 (TP1) / 1:4 (TP2) - di atas standar video (1:1.5) sesuai paten.
- Jika jarak struktural melebihi cap 20 pips -> TRADE DIBATALKAN (bukan SL dipaksa lebar).
- Noise elimination: opini eksternal dicek hanya jika ada DATA; berita 30/60 menit = filter
  wajib; sesudah eksekusi, opini diabaikan penuh.

## 4. EKSEKUSI LIMIT
- Zona probabilitas tinggi (irisan OB + FVG): LIMIT order + buffer kecil (0.2-0.5 ATR M15)
  + syarat batal otomatis: saat terisi PINE M15 != arah ATAU candle tidak OK.
- Zona biasa: tunggu tekanan terkonfirmasi (market order manual setelah konfirmasi).
- Esksekusi TIDAK buta: limit terisi bukan = masuk. PINE + candle tetap penentu.

## 5. ATURAN TAMBAHAN
- Zona bekas (kena-batal) tidak dipakai ulang hari itu.
- Quota: 1-3 entry/hari, 2 loss = stop, reset tiap 07:00 WIB.
- Sniper = input analisis wajib di SETIAP scan (tanpa diminta), tapi bukan pemicu otomatis.
- Semua trade dicatat (catat.cjs / trade_log.json) sebagai bukti win rate 78%.

## HITUNGAN CEPAT (lot 0.01 -> 100 USC/pt, lot 0.1 -> 1000 USC/pt)
- SL 10 pips = -103 USC (0.01) / -1,030 USC (0.1)
- TP1 30 pips = +297 USC (0.01) / +2,970 USC (0.1)
- TP2 40 pips = +397 USC (0.01) / +3,970 USC (0.1)