// pagi_baru.cjs - ROUTINE PAGI BARU (auto-reset jatah + overlay + monitor + scan)
// Jalan setiap pagi untuk reset sistem hari ini.
// Ganti pagi_siap.cjs (mati) yang sudah tidak berfungsi.
var execSync = require('child_process').execSync;
var spawn = require('child_process').spawn;
var http = require('http');
var fs = require('fs');
var net = require('net');
var TV_DIR = process.env.LOCALAPPDATA + '\\tradingview-mcp';
var TV_EXE = TV_DIR + '\\TradingView.Desktop_3.3.0.7992_x64__n534cwy3pjxzj\\TradingView.exe';
var LOCK = 'C:/HEBAT/monitor.lock';
var TODAY = new Date().toISOString().slice(0, 10);

function waitCDP(retries) {
  retries = retries || 45;
  return new Promise(function(r) {
    function check(a) {
      if (a >= retries) { r(false); return; }
      var s = new net.Socket(); s.setTimeout(1000);
      s.on('connect', function() { s.destroy(); r(true); });
      s.on('error', function() { s.destroy(); setTimeout(function() { check(a+1); }, 2000); });
      s.connect(9222, '127.0.0.1');
    }
    check(0);
  });
}
function findExe() {
  if (fs.existsSync(TV_EXE)) return TV_EXE;
  try {
    var d = fs.readdirSync(TV_DIR).filter(function(x) { return x.startsWith('TradingView.Desktop_'); });
    for (var i = 0; i < d.length; i++) {
      var p = TV_DIR + '\\' + d[i] + '\\TradingView.exe';
      if (fs.existsSync(p)) return p;
    }
  } catch(e) {}
  return null;
}
function execNode(f) {
  try { execSync('node C:\\HEBAT\\' + f, { stdio: 'inherit' }); }
  catch(e) { console.log('  ' + f + ' error: ' + e.message); }
}
function resetJatah() {
  var f = 'C:/HEBAT/entry_hari.json';
  var h = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (h.tanggal !== TODAY) {
    var prev = h.tanggal;
    var prevLoss = h.loss_count;
    fs.writeFileSync(f, JSON.stringify({ tanggal: TODAY, entry_ke: 0, hasil_1: '', hasil_2: '', hasil_3: '', sisa_jatah: 3, loss_count: 0, note: 'Reset auto pagi ' + TODAY + '. Hari sebelumnya: ' + prev + ' (loss_count ' + prevLoss + '). Fresh jatah 3 entry, 0 loss.' }, null, 2));
    console.log('  [RESET JATAH] ' + prev + ' -> ' + TODAY + ' | sisa_jatah=3, loss_count=0 (sebelumnya loss ' + prevLoss + ')');
  } else {
    console.log('  [JATAH] Sudah ' + TODAY + ' (sisa_jatah=' + h.sisa_jatah + ', loss=' + h.loss_count + ')');
  }
}
function monitorOk() {
  try {
    var pid = parseInt(fs.readFileSync(LOCK, 'utf8'));
    if (pid && pid !== process.pid) { process.kill(pid, 0); return pid; }
  } catch(e) {}
  return null;
}
function cdpReady(retries) {
  retries = retries || 15;
  return new Promise(function(r) {
    function check(a) {
      if (a >= retries) { r(false); return; }
      var s = new net.Socket(); s.setTimeout(1000);
      s.on('connect', function() { s.destroy(); r(true); });
      s.on('error', function() { s.destroy(); setTimeout(function() { check(a+1); }, 2000); });
      s.connect(9222, '127.0.0.1');
    }
    check(0);
  });
}

(async function() {
  console.log('══════════════════════════════════════');
  console.log('  PAGI BARU ' + TODAY);
  console.log('══════════════════════════════════════');

  // 1. TV (CDP check + start if needed)
  var tv = findExe();
  var cdp = await cdpReady(3);
  if (!cdp) {
    console.log('  >> TradingView mati - nyalakan...');
    if (!tv) { console.log('  !! TV exe tidak ditemukan - buka manual'); }
    else { spawn(tv, ['--remote-debugging-port=9222'], {detached:true,stdio:'ignore'}).unref(); await waitCDP(45); await new Promise(function(r){setTimeout(r,3000);}); }
  } else { console.log('  >> TradingView sudah aktif (CDP on)'); }
  await waitCDP(15);

  // 2. Reset jatah
  resetJatah();

  // 3. Overlay
  console.log('  >> Overlay posisi live...');
  execNode('overlay_position.cjs');

  // 4. Monitor
  var mp = monitorOk();
  if (mp) { console.log('  >> Monitor sudah jalan (PID ' + mp + ')'); }
  else {
    console.log('  >> Monitor belum jalan - start...');
    var m = spawn('node', ['C:\\HEBAT\\monitor_limit_xau.cjs'], {detached:true,stdio:'ignore'}); m.unref();
    try { fs.writeFileSync(LOCK, String(m.pid)); } catch(e) {}
    await new Promise(function(r){setTimeout(r,5000);});
    console.log('  >> MONITOR STARTED PID ' + m.pid);
  }

  // 5. Scan
  console.log('  >> Scan gabungan...');
  execNode('analisa_gabungan.cjs');

  console.log('');
  console.log('══════════════════════════════════════');
  console.log('  ✅ PAGI BARU SELESAI');
  console.log('  ⚠ CATATAN: monitor baca bars masih bisa error jika TV versi baru (widget-aKdZqnMd).');
  console.log('     Cek harga real di MT5 jika monitor log menunjukan error "undefined".');
  console.log('     Pine Editor CDP tidak bisa (TV 2026 ganti widget). Deploy via web/chart).');
  console.log('══════════════════════════════════════');
})();
