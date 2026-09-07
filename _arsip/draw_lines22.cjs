const http = require('http');
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const targets = JSON.parse(d);
    const chart = targets.find(t => t.type === 'page' && t.url && t.url.includes('/chart/') && !t.url.includes('doubleclick'));
    if (!chart) { console.log('Chart not found'); process.exit(1); }
    const WebSocket = require('ws');
    const ws = new WebSocket(chart.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) { return new Promise(r => { const msgId = id++; const h = (raw) => { const resp = JSON.parse(raw.toString()); if (resp.id === msgId) { ws.removeListener('message', h); r(resp.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: msgId, method: m, params: p || {} })); }); }
    ws.on('open', async () => {
      await send('Page.enable');
      await send('Runtime.enable');

      const code = `
(function() {
  var levels = [
    {p:4070, l:'TP2 4070', c:'#008080'},
    {p:4040, l:'TP1 4040', c:'#00FF00'},
    {p:4030, l:'ENTRY 4030', c:'#00BFFF'},
    {p:4020, l:'SL 4020', c:'#FF6347'}
  ];
  var chartDiv = document.querySelector('.chart-container') || document.querySelector('#chart') || document.querySelector('[class*="chartContainer"]') || document.querySelector('.layout__area--center');
  if (!chartDiv) { console.log('no chart div'); return; }
  var rect = chartDiv.getBoundingClientRect();
  var old = document.getElementById('smc_overlay');
  if (old) old.remove();
  var ov = document.createElement('div');
  ov.id = 'smc_overlay';
  ov.style.cssText = 'position:fixed;top:'+(rect.y+40)+'px;right:20px;z-index:9999;font-family:monospace;font-size:13px;background:rgba(0,0,0,0.85);padding:12px;border-radius:8px;border:1px solid #444;min-width:160px;';
  var t = document.createElement('div');
  t.style.cssText = 'color:#FFD700;font-weight:bold;font-size:14px;margin-bottom:8px;text-align:center;';
  t.textContent = 'SMC LEVELS';
  ov.appendChild(t);
  levels.forEach(function(l) {
    var r = document.createElement('div');
    r.style.cssText = 'display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #333;';
    var sp = document.createElement('span');
    sp.style.cssText = 'color:'+l.c+';font-weight:bold;';
    sp.textContent = l.l;
    r.appendChild(sp);
    ov.appendChild(r);
  });
  document.body.appendChild(ov);
  console.log('SMC overlay injected');
})();
      `.trim();

      await send('Runtime.evaluate', { expression: code });
      console.log('Overlay injected');
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
