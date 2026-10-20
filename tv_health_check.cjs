const http = require('http');

http.get('http://127.0.0.1:9222/json/version', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const v = JSON.parse(data);
      console.log('TradingView Desktop: TERHUBUNG');
      console.log('WebSocket:', v.webSocketDebuggerUrl || '-');
      console.log('Version:', v.Browser || v['Protocol-Version'] || '-');
      process.exit(0);
    } catch (e) {
      console.log('Gagal parse response:', e.message);
      process.exit(1);
    }
  });
}).on('error', (e) => {
  console.log('TradingView Desktop: TIDAK TERHUBUNG');
  console.log('Error:', e.message);
  console.log('Pastikan TradingView Desktop berjalan dengan --remote-debugging-port=9222');
  process.exit(1);
});
