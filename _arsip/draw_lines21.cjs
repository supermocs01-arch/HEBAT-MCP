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
    function send(m, p) {
      return new Promise(r => {
        const msgId = id++;
        const h = (raw) => { const resp = JSON.parse(raw.toString()); if (resp.id === msgId) { ws.removeListener('message', h); r(resp.result); } };
        ws.on('message', h);
        ws.send(JSON.stringify({ id: msgId, method: m, params: p || {} }));
      });
    }
    ws.on('open', async () => {
      await send('Page.enable');
      await send('Runtime.enable');

      const r = await send('Runtime.evaluate', {
        expression: `(function() {
  try {
    var api = window.TradingViewApi;
    var wv = api._activeChartWidgetWV.value();
    var cw = wv._chartWidget;
    var model = cw.model();

    var lineCmds = model._createLineCommands;
    var info = {};

    if (lineCmds) {
      info.type = typeof lineCmds;
      if (typeof lineCmds === 'object') {
        info.keys = Object.keys(lineCmds);
        // Try to find a method to add/edit lines
        info.methods = Object.keys(lineCmds).filter(function(k) { return typeof lineCmds[k] === 'function'; });
      }
    }

    // Also check if _createLineCommands has a createHorizontalLine
    if (lineCmds && lineCmds.createHorizontalLine) {
      var result = lineCmds.createHorizontalLine({price: 4030, text: 'ENTRY', color: '#00BFFF'});
      info.createResult = !!result;
    }

    // Check for any "create" method
    if (lineCmds) {
      for (var key in lineCmds) {
        if (key.indexOf('reate') >= 0 || key.indexOf('add') >= 0 || key.indexOf('Add') >= 0 || key.indexOf('Horizontal') >= 0) {
          info['method_' + key] = typeof lineCmds[key];
        }
      }
    }

    return JSON.stringify(info);
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
      });

      console.log(JSON.parse(r.result.value));

      // Now try to create lines using the _createLineCommands
      const r2 = await send('Runtime.evaluate', {
        expression: `(function() {
  try {
    var api = window.TradingViewApi;
    var wv = api._activeChartWidgetWV.value();
    var cw = wv._chartWidget;
    var model = cw.model();
    var lc = model._createLineCommands;

    if (!lc) return JSON.stringify({err: 'no line commands'});

    var levels = [
      {price: 4030, title: 'ENTRY 4030', color: '#00BFFF'},
      {price: 4020, title: 'SL 4020', color: '#FF6347'},
      {price: 4040, title: 'TP1 4040', color: '#00FF00'},
      {price: 4070, title: 'TP2 4070', color: '#008080'}
    ];

    var results = [];
    levels.forEach(function(l) {
      try {
        // Try various methods that might exist
        var added = false;
        if (lc.executeCommand) {
          lc.executeCommand('create_horizontal_line', {price: l.price, text: l.title, color: l.color});
          added = true;
        } else {
          // Try to find the horizontal line command by calling addLine or similar
          // Using the entity collection approach
          var entity = wv._lineDataSources;
          if (!entity) {
            // Try direct method
            for (var key in lc) {
              if (typeof lc[key] === 'function' && key.indexOf('Horizontal') >= 0) {
                lc[key]({price: l.price, text: l.title, color: l.color});
                added = true;
                break;
              }
            }
          }
        }
        results.push({price: l.price, added: added});
      } catch(e) {
        results.push({price: l.price, err: e.message.substring(0,80)});
      }
    });

    return JSON.stringify(results);
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
      });

      console.log(JSON.parse(r2.result.value));
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
