const http = require('http');
const WebSocket = require('ws');

http.get('http://127.0.0.1:9222/json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    if (!t) { console.log('No chart'); process.exit(1); }
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    let id = 1;
    const pending = {};
    ws.on('message', raw => {
      try {
        const j = JSON.parse(raw.toString());
        if (j.id && pending[j.id]) {
          clearTimeout(pending[j.id].timer);
          const cb = pending[j.id].cb;
          delete pending[j.id];
          if (cb) cb(j.result);
        }
      } catch(e){}
    });
    function send(m, p) {
      return new Promise(r => {
        const mid = ++id;
        pending[mid] = { cb: r, timer: setTimeout(() => { delete pending[mid]; }, 8000) };
        ws.send(JSON.stringify({ id: mid, method: m, params: p || {} }));
      });
    }
    ws.on('open', async () => {
      await send('Page.enable');
      await send('Runtime.enable');
      await send('Runtime.evaluate', { expression: "window.TradingViewApi._activeChartWidgetWV.value()._chartWidget.setResolution('5')", returnByValue: true });
      await new Promise(r => setTimeout(r, 3000));
      
      const expr = `(function() {
        try {
          var w = window.TradingViewApi._activeChartWidgetWV.value()._chartWidget;
          var model = w._modelWV._value;
          var series = model.m_model._mainSeries;
          var src = series._seriesSource;
          var dataEvents = src._dataEvents;
          var info = {
            dataEventsKeys: Object.keys(dataEvents).slice(0,15),
          };
          // Check _data on source
          if (src._data) {
            info.srcDataKeys = Object.keys(src._data).slice(0,15);
            info.srcDataType = typeof src._data;
            if (src._data._chunks) {
              info.chunksLen = src._data._chunks.length;
            }
            if (src._data._data) {
              info.innerDataLen = src._data._data.length || Object.keys(src._data._data).length;
            }
          }
          // Try to access the conflated builder
          var cb = series._conflatedChunksBuilder;
          if (cb) {
            info.cbKeys = Object.keys(cb).slice(0,15);
          }
          return JSON.stringify(info);
        } catch(e) {
          return JSON.stringify({error: e.message});
        }
      })()`;
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      console.log('Info:', r?.result?.value);

      // Try to use lastProjectionPrice and iterate backwards
      const expr2 = `(function() {
        try {
          var w = window.TradingViewApi._activeChartWidgetWV.value()._chartWidget;
          var model = w._modelWV._value;
          var series = model.m_model._mainSeries;
          var d = series.data();
          var size = d.size();
          // Try valueAt with different indices to find non-null
          var results = [];
          for (var i = size - 1; i >= Math.max(0, size - 5); i--) {
            try {
              var bar = d.valueAt(i);
              if (bar) {
                results.push({idx: i, time: bar.time, open: bar.open, high: bar.high, low: bar.low, close: bar.close, keys: Object.keys(bar).slice(0,10)});
              } else {
                results.push({idx: i, null: true});
              }
            } catch(e2) {
              results.push({idx: i, err: e2.message});
            }
          }
          return JSON.stringify({size: size, results: results});
        } catch(e) {
          return JSON.stringify({error: e.message});
        }
      })()`;
      const r2 = await send('Runtime.evaluate', { expression: expr2, returnByValue: true });
      console.log('Data:', r2?.result?.value);

      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));
