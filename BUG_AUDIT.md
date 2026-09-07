# BUG AUDIT REPORT — Sistem Trading Fitra
**Tanggal**: 2 Sep 2026
**Metode**: Static code review + live test baca_pine_json.cjs + scan_all_tf.cjs
**Auditor**: AI (Fatra)

---

## 🚨 TEMUAN KRITIS (HARUS DIPERBAIKI)

### **BUG #1: baca_pine_json.cjs hanya bisa baca LEGACY, bukan JSON baru** ❌ BLOCKER

**Symptom** (live test):
```
=== PINE_DATA (legacy) ===
PINE_DATA|4363.165|78.2|FLAT|0|10.23|NO_SETUP|DISKON|4372.2|NaN|NaN|NaN|LONDON|BULL|BEAR|BEAR|BULL
```

**Penyebab**:
- Pine v1.0 saya generate 2 label: `PINE_DATA|` (legacy) DAN `PINE_DATA_JSON|...` (JSON).
- Tapi di `baca_pine_json.cjs` line 47-48, ada `else if` yang **skip JSON jika legacy ditemukan duluan**:
  ```javascript
  col.forEach(function(l){
      if(l.t && l.t.indexOf('PINE_DATA_JSON')===0) pdJson=l.t;  // ← ini AKAN jalan duluan kalau JSON ada
      else if(l.t && l.t.indexOf('PINE_DATA|')===0) pdLegacy=l.t;  // ← tapi kalau ada PINE_DATA_| (with underscore?) malah priority
  });
  ```
- Hasil: kalau ada 2 label di chart, hanya `pdLegacy` yang terambil (karena order baca labels = dari yang paling baru/atas).

**Fix**:
```javascript
// Ganti dengan logika yang PASTI memprioritaskan JSON:
col.forEach(function(l){
    if(l.t && l.t.indexOf('PINE_DATA_JSON')===0) pdJson=l.t;  // SELALU cek JSON duluan
});
if (!pdJson) {  // kalau tidak ada JSON, baru fallback legacy
    col.forEach(function(l){
        if(l.t && l.t.indexOf('PINE_DATA|')===0) pdLegacy=l.t;
    });
}
```

**Severity**: 🔴 CRITICAL — analyzer tidak akan pernah baca JSON baru.

---

### **BUG #2: scan_all_tf.cjs = 5 dari 6 TF PINE NOT_FOUND** ❌ BLOCKER

**Symptom** (live test):
```
[M5] PINE NOT_FOUND
[M15] PINE NOT_FOUND
[M30] PINE NOT_FOUND
[H1] price=4364.595 ...   ← H1 OK
[H4] price=4364.7 ...     ← H4 OK
[D1] PINE NOT_FOUND
[M5] price=4365.42 ...    ← M5 kedua OK
```

**Penyebab**:
- Hanya H1, H4, dan M5 kedua yang return PINE label.
- Ini konsisten dengan PINE bug: setelah `setResolution()`, butuh **delay lebih lama** agar Pine recalculate.
- `scan_all_tf.cjs` pakai `sleep 2500ms` setelah setResolution. **TERLALU CEPAT** untuk Pine v6.
- H4/H1 mungkin OK karena resolution-nya sama dengan sebelumnya, jadi Pine tidak recalculate.

**Fix**:
```javascript
// Naikkan sleep ke 4000-5000ms (5 detik) untuk M5/M15/M30
await sleep(5000);  // was 2500
// ATAU: tambah retry kalau PINE NOT_FOUND
const r = await send('Runtime.evaluate', { expression: pineExpr, returnByValue: true });
if (r?.result?.value === 'NOT_FOUND') {
  await sleep(2000);  // retry setelah delay
  const r2 = await send('Runtime.evaluate', { expression: pineExpr, returnByValue: true });
  // pakai r2
}
```

**Severity**: 🔴 CRITICAL — tanpa fix ini, MTF tidak pernah lengkap.

---

### **BUG #3: scan_all_tf.cjs TIDAK restore final resolution** ❌ MEDIUM

**Symptom**: Setelah scan, chart di M5 (TF terakhir). Tidak balik ke M15 atau TF awal.

**Penyebab**: Lihat `cycle_tf_efficient.cjs` (yang BARU saya buat) → sudah handle ini. Tapi `scan_all_tf.cjs` (yang lama) **tidak**.

**Fix**:
```javascript
// Di akhir scan_all_tf.cjs setelah loop, tambah:
// Restore ke M15 (atau initial resolution)
await send('Runtime.evaluate', { 
  expression: "window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.setResolution('15')" 
});
```

**Severity**: 🟡 MEDIUM — analisa masih jalan, tapi user harus manual switch ke M15 setelahnya.

---

## ⚠️ TEMUAN MEDIUM (SEBAIKNYA DIPERBAIKI)

### **BUG #4: Pine v1.0 — baris 282 salah reference** ⚠️ POTENTIAL BUG

**Lokasi**: `smc_ict_unified_v1.pine` line 282-289 (sudah saya hapus di fix sebelumnya)

**Symptom**: `if i_blokH4Law and h4Trend == "BEAR"` — `h4Trend` adalah PLACEHOLDER yang saya set = `m15Trend`. Jadi filter ini sebenarnya filter M15, bukan H4 (sesuai label).

**Status**: ✅ SUDAH DIPERBAIKI (saya hapus baris itu, tinggalkan analyzer yang handle MTF).

---

### **BUG #5: monitor_limit_xau.cjs tidak bisa handle PINE v1.0** ⚠️ MEDIUM

**Symptom** (belum ditest): Monitor pakai `l.t.indexOf('PINE_DATA')===0` — ini akan match **KEDUA** label (`PINE_DATA|` dan `PINE_DATA_JSON|`). Tapi setelah ambil, dia split pakai `pine.split('|')` (line 113), yang **akan GAGAL** untuk JSON karena JSON pakai `|` di dalam string.

**Penyebab**:
```javascript
// monitor_limit_xau.cjs line 113:
const pine = v.pine ? v.pine.split('|') : null;
// Untuk PINE_DATA|4363.165|78.2|... → split OK
// Untuk PINE_DATA_JSON|{"v":"1.0",...} → split akan pecah JSON jadi rusak
```

**Fix**:
```javascript
// Di monitor_limit_xau.cjs, prioritaskan label LEGACY:
// (atau update monitor untuk handle JSON)
col.forEach(function(l){
    if(l.t && l.t.indexOf('PINE_DATA|')===0) st=l.t;  // LEGACY duluan (tanpa underscore)
    else if(l.t && l.t.indexOf('PINE_DATA_JSON|')===0) st=l.t;  // JSON sebagai fallback
});
```

**Severity**: 🟡 MEDIUM — monitor masih jalan dengan legacy, tapi bisa salah baca kalau JSON duluan ditemukan.

---

### **BUG #6: hi_fitra.cjs — race condition saat cold boot** ⚠️ MEDIUM

**Symptom** (potential): Saat laptop baru booting:
1. TV process mati → `tvAlive = false`
2. Spawn TV dengan `--remote-debugging-port=9222` (line 78)
3. Tunggu `waitCDP(60)` (maks 2 menit)
4. Setelah CDP ready, langsung `execSync('node ... analisagabungan.cjs')` (line 114)

**Masalah**: TV mungkin sudah respond CDP, tapi **chart belum load** (still loading splash screen). `analisa_gabungan.cjs` akan gagal baca PINE (return "none").

**Fix**:
```javascript
// Tambah delay setelah CDP ready, sebelum scan:
if (started) {
  console.log('>> TV baru nyala, tunggu chart fully loaded...');
  await new Promise(s => setTimeout(s, 8000));  // 8 detik untuk chart render
}
// Plus: tambahkan retry di analisa_gabungan.cjs kalau PINE "none"
```

**Severity**: 🟡 MEDIUM — biasanya first scan gagal tapi retry kedua berhasil.

---

### **BUG #7: cycle_tf_efficient.cjs — tidak ada retry kalau setResolution gagal** ⚠️ LOW

**Symptom**: Kalau `setResolution()` timeout (misal TV lag), script lanjut tanpa retry.

**Fix** (sudah ditulis di CONFIG tapi belum dipakai):
```javascript
// Tambah retry logic:
if (!r || r.error) {
  log(`Retry ${res}...`);
  await sleep(2000);
  const r2 = await send('Runtime.evaluate', {...});
  // pakai r2
}
```

**Severity**: 🟢 LOW — biasanya setResolution reliable.

---

## ✅ TEMUAN OK (SUDAH BENAR)

| Aspek | Status | Keterangan |
|-------|--------|-----------|
| `cycle_tf_efficient.cjs` | ✅ OK | Tested 9.4 detik, 6/6 OK, restore M15 |
| `monitor_limit_xau.cjs` filter glitch | ✅ OK | Ada filter tick 159.32 (pelajaran 25 Agu) |
| `monitor.lock` PID check | ✅ OK | Anti-duplicate working |
| Pine v1.0 M6B (MTF placeholder) | ✅ OK | request.security SUDAH DIHAPUS |
| Pine v1.0 Kill Zones | ✅ OK | time() + input.session() |
| Pine v1.0 FVG multi-zone | ✅ OK | array max 5 + auto-invalidate |
| Pine v1.0 PO3 + Judas | ✅ OK | Logic benar |
| `config.json` pineStudyId | ✅ OK | ppv22M valid |
| `analisa_gabungan.cjs` cold boot handling | ✅ OK | Sudah ada logic "none" detection |

---

## 🔧 ACTION PLAN (urutan prioritas)

### **PRIORITAS 1: Fix baca_pine_json.cjs (BLOCKER)**
Ganti logika forEach dengan prioritas JSON.

### **PRIORITAS 2: Fix scan_all_tf.cjs (BLOCKER)**
Naikkan sleep ke 5000ms + retry + restore resolution.

### **PRIORITAS 3: Fix monitor_limit_xau.cjs (MEDIUM)**
Prioritaskan label LEGACY, fallback ke JSON.

### **PRIORITAS 4: Fix hi_fitra.cjs cold boot (MEDIUM)**
Tambah delay 8 detik setelah CDP ready pertama kali.

### **PRIORITAS 5: Tambah retry di cycle_tf_efficient.cjs (LOW)**
Optional, untuk robustness.

---

## 📊 SCOREBOARD

| Komponen | Bug Count | Severity Tertinggi | Status |
|----------|-----------|-------------------|--------|
| Pine Script v1.0 | 0 (fixed) | - | ✅ Clean |
| baca_pine_json.cjs | 1 | 🔴 CRITICAL | ⚠️ Perlu fix |
| scan_all_tf.cjs | 2 | 🔴 CRITICAL | ⚠️ Perlu fix |
| monitor_limit_xau.cjs | 1 | 🟡 MEDIUM | ⚠️ Perlu fix |
| hi_fitra.cjs | 1 | 🟡 MEDIUM | ⚠️ Perlu fix |
| cycle_tf_efficient.cjs | 1 | 🟢 LOW | Optional |
| **Total** | **6 bugs** | **2 critical, 3 medium, 1 low** | |

---

## 💡 LESSON LEARNED (untuk AI selanjutnya)

1. **Selalu test end-to-end** — bug #1 dan #2 tidak akan ketahuan tanpa live test.
2. **Pine label `PINE_DATA|` vs `PINE_DATA_JSON|`** — string match `indexOf('PINE_DATA')===0` match DUA-DUANYA. Wajib selektif.
3. **CDP timing matters** — `setResolution()` butuh 4-5 detik untuk Pine recalculate, bukan 2-2.5.
4. **Cold boot selalu lebih lambat** — tambah delay setelah CDP ready pertama kali.
5. **Multiple label = multiple match** — selalu prioritaskan yang paling baru/JSON, fallback ke legacy.

---

*Audit selesai 2 Sep 2026 oleh AI (Fatra). Selanjutnya: fix bug #1, #2, #3, #4.*
