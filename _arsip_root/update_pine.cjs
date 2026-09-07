const http = require('http');
const fs = require('fs');

http.get('http://127.0.0.1:9222/json', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const targets = JSON.parse(data);
    const chart = targets.find(t => t.type === 'page' && t.url && t.url.includes('/chart/') && !t.url.includes('doubleclick'));
    if (!chart) { console.log('Chart page not found'); process.exit(1); }

    const WebSocket = require('ws');
    const ws = new WebSocket(chart.webSocketDebuggerUrl);
    let msgId = 1;

    function send(method, params) {
      return new Promise((resolve) => {
        const id = msgId++;
        const msg = JSON.stringify({ id, method, params: params || {} });
        const handler = (raw) => {
          const resp = JSON.parse(raw.toString());
          if (resp.id === id) {
            ws.removeListener('message', handler);
            resolve(resp.result);
          }
        };
        ws.on('message', handler);
        ws.send(msg);
      });
    }

    ws.on('open', async () => {
      try {
        await send('Page.enable');
        await send('Runtime.enable');
        await send('Input.enable');

        // Navigate to chart page
        await send('Page.navigate', { url: chart.url });

        // Wait for page load
        await send('Page.loadEventFired');
        console.log('Page loaded, attempting to update indicator...');

        // Method 1: Try direct TradingView API to find and update the study
        const result1 = await send('Runtime.evaluate', {
          expression: `
            (function() {
              try {
                var api = window.TradingViewApi;
                if (!api) return JSON.stringify({err: 'TradingViewApi not found'});
                var wv;
                try { wv = api._activeChartWidgetWV.value(); } catch(e) { return JSON.stringify({err: 'Cannot get widget: ' + e.message}); }
                var w = wv._chartWidget;
                var model = w.model();
                var studies = model.allStudies();
                var target = studies.find(function(s) { return s.name && (s.name.indexOf('SMC') >= 0 || s.name.indexOf('BOS') >= 0); });
                if (target) {
                  var oldSource = target.source();
                  var newSource = document.getElementById('PIN_SCRIPT_PLACEHOLDER');
                  return JSON.stringify({found: true, oldName: target.name, oldSourceLen: (oldSource || '').length});
                } else {
                  return JSON.stringify({found: false, studyCount: studies.length, names: studies.map(function(s){return s.name;}).join(', ')});
                }
              } catch(e) { return JSON.stringify({err: e.message, stack: e.stack}); }
            })()
          `
        });

        const r1 = JSON.parse(result1.result.value);
        console.log('Method 1 result:', r1);

        // Method 2: Try to open Pine Editor via keyboard shortcut
        // Focus the page first
        await send('Runtime.evaluate', {
          expression: `document.querySelector('body').focus(); true`
        });

        // Try Ctrl+\ (backslash) to toggle Pine Editor
        const MODIFIERS = ['Control'];
        await send('Input.dispatchKeyEvent', {
          type: 'rawKeyDown',
          windowsVirtualKeyCode: 220, // backslash
          key: '\\',
          code: 'Backslash',
          modifiers: 2 // Ctrl
        });
        await send('Input.dispatchKeyEvent', {
          type: 'keyUp',
          windowsVirtualKeyCode: 220,
          key: '\\',
          code: 'Backslash',
          modifiers: 2
        });
        await send('Input.dispatchKeyEvent', {
          type: 'keyUp',
          windowsVirtualKeyCode: 17, // Ctrl
          key: 'Control',
          code: 'ControlLeft'
        });

        console.log('Sent Ctrl+\\, waiting...');
        await new Promise(r => setTimeout(r, 2000));

        // Method 3: Try to find and click Pine Editor tab
        const result2 = await send('Runtime.evaluate', {
          expression: `
            (function() {
              try {
                var buttons = document.querySelectorAll('button, div[role="tab"], [class*="pine"], [class*="editor"]');
                var found = [];
                for (var i = 0; i < buttons.length; i++) {
                  var txt = (buttons[i].textContent || '').toLowerCase();
                  if (txt.indexOf('pine') >= 0 || txt.indexOf('editor') >= 0) {
                    found.push({tag: buttons[i].tagName, class: (buttons[i].className || '').substring(0,80), text: (buttons[i].textContent || '').substring(0,40)});
                  }
                }
                // Also find all tab-like elements
                var tabs = document.querySelectorAll('[class*="tab"]');
                var tabInfo = [];
                for (var j = 0; j < tabs.length; j++) {
                  tabInfo.push({tag: tabs[j].tagName, class: (tabs[j].className || '').substring(0,60), text: (tabs[j].textContent || '').substring(0,30)});
                }
                return JSON.stringify({buttons: found, tabs: tabInfo, bodyHTML: document.body.innerHTML.substring(0, 2000)});
              } catch(e) { return JSON.stringify({err: e.message}); }
            })()
          `
        });

        const r2 = JSON.parse(result2.result.value);
        console.log('DOM exploration:');
        console.log('Buttons found:', r2.buttons ? r2.buttons.length : 'N/A');
        r2.buttons && r2.buttons.forEach(b => console.log('  ', JSON.stringify(b)));
        console.log('Tabs found:', r2.tabs ? r2.tabs.length : 'N/A');
        r2.tabs && r2.tabs.forEach(t => console.log('  ', JSON.stringify(t)));

        // Method 4: Try to use widget API to directly set study source
        const result3 = await send('Runtime.evaluate', {
          expression: `
            (function() {
              try {
                var widget = window.TradingViewApi;
                if (!widget) return JSON.stringify({err: 'no api'});
                var wv = widget._activeChartWidgetWV.value();
                var chartWidget = wv._chartWidget;
                if (chartWidget.executeActionById) {
                  var actions = ['openEditor', 'pineEditor', 'showEditor', 'toggleEditor'];
                  var available = [];
                  for (var a in chartWidget._actions) {
                    if (a) available.push(a);
                  }
                  return JSON.stringify({actions: available.slice(0, 50), hasExecuteAction: typeof chartWidget.executeActionById});
                }
                return JSON.stringify({hasActions: false, wvKeys: Object.keys(wv).slice(0,20), cwKeys: Object.keys(chartWidget).slice(0,20)});
              } catch(e) { return JSON.stringify({err: e.message}); }
            })()
          `
        });

        const r3 = JSON.parse(result3.result.value);
        console.log('Widget API:', JSON.stringify(r3).substring(0, 500));

        // Try to use widget actions to open editor
        if (r3.actions && r3.actions.length > 0) {
          const pineAction = r3.actions.find(a => a.toLowerCase().indexOf('editor') >= 0 || a.toLowerCase().indexOf('pine') >= 0);
          if (pineAction) {
            await send('Runtime.evaluate', {
              expression: `
                (function() {
                  try {
                    var wv = window.TradingViewApi._activeChartWidgetWV.value();
                    wv._chartWidget.executeActionById('${pineAction}');
                    return 'OK: ' + '${pineAction}';
                  } catch(e) { return 'Error: ' + e.message; }
                })()
              `
            });
            console.log('Executed action:', pineAction);
            await new Promise(r => setTimeout(r, 2000));
          }
        }

        console.log('\nDone. Script is already on clipboard. Open TradingView, paste (Ctrl+V) in Pine Editor, and save with Ctrl+Enter.');

      } catch (e) {
        console.error('Error:', e.message);
      }
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
