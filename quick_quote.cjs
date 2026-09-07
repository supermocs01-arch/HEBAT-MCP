const http = require('http');
http.get('http://127.0.0.1:9222/json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    if (!t) { console.log('no chart'); process.exit(1); }
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        id: 1, method: 'Runtime.enable'
      }));
      ws.send(JSON.stringify({
        id: 2, method: 'Runtime.evaluate', params: {
          expression: `(function(){try{var c=window.TradingViewApi._activeChartWidgetWV.value();var b=c._chartWidget._paneWidgets._value[0]._state.m_dataSources[0]._seriesSource._data.m_bars._items;var last=b[b.length-1].value;var prev=b.length>1?b[b.length-2].value:null;return JSON.stringify({last:last[4],lastTime:new Date(last[0]*1000).toISOString(),prev:prev?prev[4]:null,nbars:b.length})}catch(e){return JSON.stringify({err:e.message})}})()`,
          returnByValue: true
        }
      }));
    });
    ws.on('message', m => {
      const msg = JSON.parse(m);
      if (msg.id === 2) { console.log(JSON.stringify(msg.result && msg.result.value)); ws.close(); process.exit(0); }
    });
    setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 8000);
  });
}).on('error', e => { console.log('CDP_ERR ' + e.message); process.exit(1); });
