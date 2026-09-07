const http = require('http');
const fs = require('fs');
const SID = JSON.parse(fs.readFileSync('C:/HEBAT/config.json', 'utf8')).pineStudyId;
http.get('http://127.0.0.1:9222/json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p) => new Promise(r => { const mid = id++; const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); r(j.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); });
    ws.on('open', async () => {
      await send('Runtime.enable');
      const expr = `(function(){
        var steps=[];
        try{
          var chart=window.TradingViewApi._activeChartWidgetWV.value();
          steps.push('chart ok');
          var st=null;
          try{ st=chart.getStudyById('${SID}'); }catch(e){ steps.push('SID err:'+e.message); }
          if(!st){ steps.push('st null setelah SID'); try{ st=chart.getStudyById('PTdIuB'); }catch(e){} }
          if(!st){ return JSON.stringify({fail:'st null'}); }
          steps.push('st ok');
          var src=st._study||st;
          var g=src._graphics||(src._source&&src._source._graphics);
          if(!g){ return JSON.stringify({fail:'no graphics'}); }
          steps.push('g ok');
          var pc=g._primitivesCollection;
          var col=pc.dwglabels.get('labels').get(false)._primitivesDataById;
          steps.push('labels=' + col.size);
          var dl=pc.dwglines.get('lines').get(false)._primitivesDataById;
          steps.push('lines=' + dl.size);
          var db=pc.dwgboxes.get('boxes').get(false)._primitivesDataById;
          steps.push('boxes=' + db.size);
          var pd=null;
          col.forEach(function(l){ if(l.t&&l.t.indexOf('PINE_DATA')===0) pd=l.t; });
          return JSON.stringify({ok:true, steps:steps, pd:pd});
        }catch(e){ return JSON.stringify({fail:e.message, steps:steps}); }
      })()`;
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      console.log(r.result.value);
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
