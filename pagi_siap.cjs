const { execSync, spawn } = require('child_process');
const http = require('http');
const net = require('net');

function waitCDP(retries = 30) {
  return new Promise(r => {
    function check(attempt) {
      if (attempt >= retries) { r(false); return; }
      const sock = new net.Socket();
      sock.setTimeout(1000);
      sock.on('connect', () => { sock.destroy(); r(true); });
      sock.on('error', () => { sock.destroy(); setTimeout(() => check(attempt+1), 2000); });
      sock.connect(9222, '127.0.0.1');
    }
    check(0);
  });
}

(async () => {
  let cdpReady = false;
  try { http.get('http://127.0.0.1:9222/json', (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ cdpReady=!!d.length; }); }).on('error',()=>{}); } catch(e) {}
  if (!cdpReady) {
    console.log('Launching TradingView...');
    const tvPath = process.env.LOCALAPPDATA + '\\tradingview-mcp\\TradingView.Desktop_3.3.0.7992_x64__n534cwy3pjxzj\\TradingView.exe';
    spawn(tvPath, ['--remote-debugging-port=9222'], { detached: true, stdio: 'ignore' }).unref();
    console.log('Waiting for CDP port...');
    cdpReady = await waitCDP(45);
    if (!cdpReady) { console.error('CDP not ready'); process.exit(1); }
    await new Promise(r => setTimeout(r, 5000));
  }
  execSync('node C:\\HEBAT\\inject_session.cjs', { stdio: 'inherit' });
  execSync('node C:\\HEBAT\\analyze_chart.cjs', { stdio: 'inherit' });
  console.log('Analisis Multi-Timeframe (H4+H1+M15)...');
  execSync('node C:\\HEBAT\\analyze_mtf.cjs', { stdio: 'inherit' });
  console.log('Starting auto monitor...');
  const m = spawn('node', ['C:\\HEBAT\\auto_monitor_v2.cjs'], { detached: true, stdio: 'inherit' });
  m.unref();
  console.log('');
  console.log('══════════════════════════════════════');
  console.log('  📌 MODE SWING SERIUS - REMINDER');
  console.log('══════════════════════════════════════');
  console.log('  Lot 0.1 (TP1 0.04 / TP2 0.06)');
  console.log('  TP1 1:1 | TP2 1:4 | SL tetap');
  console.log('  H4 struktur + H1 entry, hold 1-5 hari');
  console.log('  Exit di level, JANGAN micromanage');
  console.log('══════════════════════════════════════');
  console.log('✅ PAGI ROUTINE COMPLETE - monitor running');
})();
