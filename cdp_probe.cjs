const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/C59F037685BE95BBCA42BC376F474B5D');
let idc = 0;
ws.on('open', () => {
  console.log('OPEN');
  const id = ++idc;
  ws.send(JSON.stringify({ id, method: 'Runtime.enable', params: {} }));
  ws.on('message', (raw) => {
    console.log('MSG: ' + raw.toString().substring(0, 300));
    process.exit(0);
  });
});
ws.on('error', (e) => { console.log('ERR: ' + e.message); process.exit(1); });
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 15000).unref();