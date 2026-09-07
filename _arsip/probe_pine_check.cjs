const http = require('http');
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    if (!t) { console.log('Chart not found'); process.exit(1); }
    const WebSocket = require('ws');
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) { return new Promise(r => { const msgId = id++; const h = (raw) => { const resp = JSON.parse(raw.toString()); if (resp.id === msgId) { ws.removeListener('message', h); r(resp.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: msgId, method: m, params: p || {} })); }); }
    ws.on('open', async () => {
      await send('Runtime.enable');
      const r = await send('Runtime.evaluate', {
        expression: `(function(){
          try {
          var wv = window.TradingViewApi._activeChartWidgetWV.value();
          var out = 'SYM=' + wv.symbol() + ' RES=' + wv.resolution();
          out += '\\nALL STUDIES(' + wv.getAllStudies().length + '):';
          wv.getAllStudies().forEach(function(s){ out += '\\n  id=' + s.id + ' | meta=' + (s.metaInfo && s.metaInfo.shortId) + ' | name=' + (s.metaInfo && s.metaInfo.name); });
          out += '\\nSTUDY PTdIuB:';
          var st = null;
          try { st = wv.getStudyById('PTdIuB'); } catch(e){ out += ' getStudyById err: ' + e.message; }
          if (!st) out += ' NULL';
          else {
            out += ' keys=' + Object.keys(st).join(',');
            var src = st._study || st;
            out += ' | srckeys=' + Object.keys(src).join(',');
            var g = src._graphics || (src._source && src._source._graphics);
            out += ' | gfx=' + (g ? 'ADA' : 'KOSONG');
            if (g) {
              var pc = g._primitivesCollection;
              out += ' | pc=' + (pc ? 'ADA' : 'null');
              if (pc) {
                var dk = Object.keys(pc).join(',');
                out += ' | dwnkeys=' + dk;
                try {
                  var col = pc.dwglabels.get('labels').get(false)._primitivesDataById;
                  out += ' | labels=' + col.size;
                  col.forEach(function(l){ if (l.t && l.t.indexOf('PINE_DATA') === 0) out += '\\n  ' + l.t; });
                } catch(e){ out += ' | label-read err: ' + e.message; }
              }
            }
          }
          out += '\\nSTUDY STATUS:';
          var st8 = wv.getStudyById('PTdIuB')._study;
          function fv(name, val) {
            try {
              if (val === null) return name + '=null';
              if (val === undefined) return name + '=undefined';
              var t = typeof val;
              if (t === 'object') return name + '=[obj:' + Object.keys(val).join(',') + ']';
              return name + '=' + String(val);
            } catch(e) { return name + '=ERR'; }
          }
          out += ' | ' + fv('status', st8._status);
          out += ' | ' + fv('compileActive', st8._compileActiveStatus);
          out += ' | ' + fv('compileErr', st8._compileErrorStatus);
          out += ' | ' + fv('compound', st8._compoundStatus);
          out += ' | ' + fv('symbolsResolved', st8._symbolsResolved);
          out += ' | ' + fv('calcTime', st8._calculationTime);
          out += ' | ' + fv('isActual', st8._isActualInterval);
          out += ' | ' + fv('isStarted', st8._isStarted);
          var bars = 0;
          try { bars = wv.chartModel()._mainSeries._bars().length; } catch(e){}
          out += ' | mainBars=' + bars;
          out += '\\nCHART STATE:';
          out += ' loadingScreen=' + wv.loadingScreenActive();
          out += ' | resolving=' + wv.symbolResolvingActive();
          out += ' | hasModel=' + wv.hasModel();
          try {
            var cw2 = wv.chartWidget();
            var cs = {};
            ['_inLoadingState','_initialLoading','_containsData','_disconnected','_connected','_justActivated','_inited','_isVisible'].forEach(function(k){ cs[k] = cw2[k]; });
            out += ' | cw: ' + JSON.stringify(cs);
            var ms = wv.chartModel()._mainSeries;
            out += ' | mainSeries: has=' + (!!ms) + ' | status=' + JSON.stringify(ms._status._value) + ' | dataBars=' + (ms._data && ms._data._bars ? ms._data._bars.size : 'none');
            out += ' | symbolWV=' + JSON.stringify(ms._symbolWV._value);
          } catch(e){ out += ' cw err: ' + e.message; }
          try {
            var esc = st8._compileErrorStatus;
            if (esc) {
              var parts = [];
              if (esc.shortMessage) parts.push('short=' + esc.shortMessage);
              if (esc.message) parts.push('msg=' + esc.message);
              if (esc.text) parts.push('text=' + esc.text);
              if (esc.filename) parts.push('file=' + esc.filename);
              if (esc.errorLines) parts.push('lines=' + JSON.stringify(esc.errorLines));
              if (parts.length) out += ' | ERROR_DETAIL: ' + parts.join(' ; ');
            }
          } catch(e){};
          try {
            var cm = wv.chartModel();
            out += ' type=' + typeof cm;
            if (cm) {
              out += ' keys=' + Object.keys(cm).join(',');
              var sts = cm._studies;
              out += ' | _studies=' + (sts ? Object.keys(sts).length : 'none');
            }
          } catch(e){ out += ' err ' + e.message; }
          out += '\\nURL=' + location.href;
          out += '\\nSTUDIES:';
          try {
            var sts = wv._chartWidget._studies || {};
            var keys = Object.keys(sts);
            out += ' count=' + keys.length;
            keys.forEach(function(k){
              var s = sts[k];
              out += '\\n  ' + k + ' | ' + (s._name || s._title || '?');
            });
          } catch(e){ out += ' err=' + e.message; }
          out += '\\nPINE_DATA labels:';
          try {
            var st = wv.getStudyById('PTdIuB');
            if (!st) { out += ' NONE (getStudyById PTdIuB kosong)'; }
            else {
              var src = st._study || st;
              var g = src._graphics || (src._source && src._source._graphics);
              if (!g) { out += ' gfx kosong'; }
              else {
                var pc = g._primitivesCollection;
                var col = pc.dwglabels.get('labels').get(false)._primitivesDataById;
                var n = 0;
                col.forEach(function(l){ if (l.t && l.t.indexOf('PINE_DATA') === 0) n++; });
                out += ' total labels=' + col.size + ' PINE_DATA=' + n;
                col.forEach(function(l){
                  if (l.t && l.t.indexOf('PINE_DATA') === 0) out += '\\n  ' + l.t;
                });
              }
            }
          } catch(e){ return 'ERROR: ' + e.message + ' | ' + e.stack; }
          } catch(e){ return 'OUTER ERROR: ' + e.message; }
          return out;
        })()`,
        returnByValue: true
      });
      console.log('RESULT:', JSON.stringify(r.result));
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });