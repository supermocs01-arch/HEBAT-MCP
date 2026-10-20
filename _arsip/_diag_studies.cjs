const http = require('http');
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync('C:/HEBAT/config.json', 'utf8'));
http.get('http://127.0.0.1:9222/json', r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    if (!t) { console.log('NO_CHART_TAB'); process.exit(1); }
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p) => new Promise(res => {
      const mid = id++;
      const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); res(j.result); } };
      ws.on('message', h);
      ws.send(JSON.stringify({ id: mid, method: m, params: p || {} }));
    });
    ws.on('open', async () => {
      await send('Runtime.enable');
      const expr = `(function(){
        var out={};
        try{
          var wv=window.TradingViewApi._activeChartWidgetWV.value();
          out.ok=true;
          var ids=null;
          try{ids=wv.getAllStudyIds?wv.getAllStudyIds():null;}catch(e){out.e1=e.message;}
          out.studyIds=ids;
          out.cfgId='${cfg.pineStudyId}';
          out.hasCfgId=ids?ids.indexOf('${cfg.pineStudyId}')>=0:false;
          try{
            var st=wv.getStudyById('${cfg.pineStudyId}');
            out.foundStudy=!!st;
            var src=st._study||st;
            var g=src._graphics||(src._source&&src._source._graphics);
            out.hasGraphics=!!g;
            if(g&&g._primitivesCollection){
              out.primKeys=[];
              g._primitivesCollection.dwglabels.forEach(function(v,k){out.primKeys.push(k);});
              var pc=g._primitivesCollection;
              try{
                var entry=pc.dwglabels.get('labels').get(false)._primitivesDataById;
                var labels=[];
                entry.forEach(function(l){if(l.t)labels.push(l.t);});
                out.total=labels.length;
                out.pineLabels=labels.filter(function(x){return x.indexOf('PINE')>=0;});
                out.long=labels.filter(function(x){return x.length>25;}).slice(0,5);
              }catch(e2){out.e2=e2.message;}
            }
          }catch(e3){out.e3=e3.message;}
        }catch(e){out.e0=e.message;}
        return JSON.stringify(out);
      })()`;
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      console.log(r.result.value);
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error('HTTP_ERR ' + e.message); process.exit(1); });
