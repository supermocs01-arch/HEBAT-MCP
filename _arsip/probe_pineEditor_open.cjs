const http = require('http');
http.get('http://127.0.0.1:9222/json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) {
      return new Promise(r => {
        const mid = id++;
        const h = raw => {
          const j = JSON.parse(raw.toString());
          if (j.id === mid) { ws.removeListener('message', h); r(j.result); }
        };
        ws.on('message', h);
        ws.send(JSON.stringify({ id: mid, method: m, params: p || {} }));
      });
    }
    ws.on('open', async () => {
      await send('Runtime.enable');
      const r = await send('Runtime.evaluate', {
        expression: `(function(){
var api=window.TradingViewApi;if(!api)return 'no api';
var out={};
try{var pe=api._pineEditorApi;out.pineEditorApi=pe?Object.keys(pe):null}catch(e){out.pineEditorApi='ERR '+e.message}
try{var pt=api._pineEditorTestApi;out.pineEditorTestApi=pt?Object.keys(pt):null}catch(e){out.pineEditorTestApi='ERR '+e.message}
try{out.pineEditor=api.pineEditor?Object.keys(api.pineEditor):null}catch(e){out.pineEditor='ERR '+e.message}
try{var wv=api._activeChartWidgetWV.value();var cw=wv._chartWidget;var keys=Object.keys(cw).filter(function(k){return /pine|editor|script/i.test(k)});out.chartWidgetPine=keys}catch(e){out.chartWidgetPine='ERR '+e.message}
return JSON.stringify(out);
})()`,
        returnByValue: true
      });
      console.log(r.result.value);
      ws.close();
      process.exit(0);
    });
  });
});
