const http = require('http');
const target = process.argv[2] ? parseFloat(process.argv[2]) : 5000;
const progress = process.argv[3] !== undefined ? parseFloat(process.argv[3]) : null;

http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const targets = JSON.parse(d);
    const chart = targets.find(t => t.url && t.url.includes('/chart/'));
    if (!chart) { console.log('no chart'); process.exit(1); }
    const WebSocket = require('ws');
    const ws = new WebSocket(chart.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) {
      return new Promise(r => {
        const mid = id++;
        const h = raw => {
          const resp = JSON.parse(raw.toString());
          if (resp.id === mid) { ws.removeListener('message', h); r(resp.result); }
        };
        ws.on('message', h);
        ws.send(JSON.stringify({ id: mid, method: m, params: p || {} }));
      });
    }
    ws.on('open', async () => {
      await send('Page.enable');
      await send('Runtime.enable');
      const expr = `(function(){
        var elT = document.getElementById('smc_prog');
        var elS = document.getElementById('smc_sisa');
        if(!elT || !elS) return JSON.stringify({err:'tracker not found'});
        var target = ${target};
        var progress = ${progress === null ? 'parseFloat(elT.textContent.replace(/[^0-9\\-]/g,"")||0)' : progress};
        var remaining = target - progress;
        if(remaining < 0) remaining = 0;
        elT.textContent = progress.toLocaleString('en-US');
        elS.textContent = remaining.toLocaleString('en-US');
        // color
        var pct = target > 0 ? progress/target : 0;
        elT.style.color = pct >= 0.5 ? '#00FF00' : (pct >= 0.2 ? '#FFD700' : '#FF6347');
        return JSON.stringify({progress: progress, remaining: remaining, target: target});
      })()`;
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      console.log('Tracker updated:', r.result.value);
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => console.log(e.message));