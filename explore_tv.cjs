const http = require('http');
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const targets = JSON.parse(d);
    const chart = targets.find(t => t.type === 'page' && t.url && t.url.includes('/chart/') && !t.url.includes('doubleclick'));
    if (!chart) { console.log('No chart page'); process.exit(1); }

    const WebSocket = require('ws');
    const ws = new WebSocket(chart.webSocketDebuggerUrl);
    let msgId = 1;
    function send(method, params) {
      return new Promise((resolve) => {
        const id = msgId++;
        const msg = JSON.stringify({ id, method, params: params || {} });
        const h = (raw) => { const r = JSON.parse(raw.toString()); if (r.id === id) { ws.removeListener('message', h); resolve(r.result); } };
        ws.on('message', h);
        ws.send(msg);
      });
    }

    ws.on('open', async () => {
      await send('Page.enable');
      await send('Runtime.enable');

      // Explore DOM to find all tabs/buttons and the bottom panel
      const r = await send('Runtime.evaluate', {
        expression: `(function() {
  try {
    var info = {};

    // Find all elements with text content
    var allEls = document.querySelectorAll('div[class*=\"tab\"], button, [role=\"tab\"]');
    var tabs = [];
    for (var i = 0; i < allEls.length && i < 50; i++) {
      var e = allEls[i];
      var txt = (e.textContent || '').trim();
      if (txt.length > 0 && txt.length < 60) {
        tabs.push({tag: e.tagName, cls: (e.className || '').substring(0,50), txt: txt.substring(0,40)});
      }
    }
    info.tabs = tabs;

    // Find all bottom panel elements
    var bottom = document.querySelectorAll('[class*=\"bottom\"], [class*=\"Bottom\"], [class*=\"panel\"], [class*=\"Panel\"]');
    var bottomEls = [];
    for (var j = 0; j < bottom.length && j < 30; j++) {
      var b = bottom[j];
      bottomEls.push({tag: b.tagName, cls: (b.className || '').substring(0,80), txt: (b.textContent || '').substring(0,30)});
    }
    info.bottomEls = bottomEls;

    // Find Pine Editor specific elements
    var pineEls = document.querySelectorAll('[class*=\"pine\"], [class*=\"Pine\"], [class*=\"PINE\"], [class*=\"editor\"], [class*=\"Editor\"]');
    var pineInfo = [];
    for (var k = 0; k < pineEls.length && k < 30; k++) {
      var p = pineEls[k];
      pineInfo.push({tag: p.tagName, cls: (p.className || '').substring(0,80), txt: (p.textContent || '').substring(0,30), id: p.id});
    }
    info.pineEls = pineInfo;

    return JSON.stringify(info, null, 2);
  } catch(e) { return JSON.stringify({err: e.message}); }
})()`
      });

      const result = JSON.parse(r.result.value);
      console.log(JSON.stringify(result, null, 2));
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
