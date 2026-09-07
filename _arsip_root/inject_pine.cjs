const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

const PINE_FILE = 'C:/HEBAT/smc_ict_unified_v1.pine';
const PINE_CODE = fs.readFileSync(PINE_FILE, 'utf8');

http.get('http://127.0.0.1:9222/json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const targets = JSON.parse(d).filter(x => x.url && x.url.includes('/chart/'));
    if (targets.length === 0) { console.log('No chart found'); process.exit(1); }
    const t = targets[0];
    console.log('Target:', t.url);
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
        pending[mid] = { cb: r, timer: setTimeout(() => { delete pending[mid]; r({error:'timeout'}); }, 15000) };
        ws.send(JSON.stringify({ id: mid, method: m, params: p || {} }));
      });
    }
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    ws.on('open', async () => {
      try {
        await send('Page.enable');
        await send('Runtime.enable');

        console.log('--- Step 1: Open Pine Editor ---');
        // Open Pine Editor - biasanya sudah di area bawah chart
        // Kita pakai keyboard shortcut Alt+E untuk Pine Editor (atau click button)
        const openEditor = await send('Runtime.evaluate', {
          expression: `(function(){
            // Cari tombol Pine Editor
            var btns = document.querySelectorAll('[data-name="pine-editor-tabs"]');
            if (btns.length > 0) { btns[0].click(); return 'clicked-tabs'; }
            // Atau pakai keyboard
            return 'no-tabs-button';
          })()`,
          returnByValue: true
        });
        console.log('Open editor:', openEditor?.result?.value);
        await sleep(1000);

        console.log('--- Step 2: Inject Pine code via Pine Script API ---');
        // Cara paling reliable: pakai internal TradingView Pine API
        // TradingView punya global object untuk Pine Studio
        const injectResult = await send('Runtime.evaluate', {
          expression: `(function(){
            try {
              // Cari Pine editor textarea/ace editor
              var editor = document.querySelector('.monaco-editor textarea') ||
                           document.querySelector('[data-mode-id="pine"]') ||
                           document.querySelector('.ace_editor textarea') ||
                           document.querySelector('textarea[spellcheck="false"]');
              if (editor) {
                editor.focus();
                editor.value = ${JSON.stringify(PINE_CODE)};
                editor.dispatchEvent(new Event('input', { bubbles: true }));
                return 'monaco-or-textarea-found';
              }
              return 'no-editor-found';
            } catch(e) { return 'ERR: ' + e.message; }
          })()`,
          returnByValue: true
        });
        console.log('Inject result:', injectResult?.result?.value);
        await sleep(2000);

        console.log('--- Step 3: Try alternative: Pine editor via React fiber ---');
        const reactInject = await send('Runtime.evaluate', {
          expression: `(function(){
            try {
              // Cari Monaco editor
              var monaco = window.monaco;
              if (monaco && monaco.editor) {
                var models = monaco.editor.getModels();
                for (var i = 0; i < models.length; i++) {
                  if (models[i].getLanguageId() === 'pine') {
                    models[i].setValue(${JSON.stringify(PINE_CODE)});
                    return 'monaco-pine-set';
                  }
                }
                // Kalau ga ada, buat model pine
                var model = monaco.editor.createModel(${JSON.stringify(PINE_CODE)}, 'pine');
                return 'monaco-pine-created';
              }
              return 'no-monaco';
            } catch(e) { return 'ERR: ' + e.message; }
          })()`,
          returnByValue: true
        });
        console.log('React inject:', reactInject?.result?.value);
        await sleep(1000);

        console.log('--- Step 4: Save & Add to chart (klik tombol) ---');
        // Klik tombol "Save" (icon disket)
        const saveResult = await send('Runtime.evaluate', {
          expression: `(function(){
            try {
              // Cari tombol save
              var saveBtn = document.querySelector('[data-name="save"]') ||
                            document.querySelector('[data-name="pine-editor-toolbar"] [data-name="save"]') ||
                            document.querySelector('button[aria-label*="Save" i]') ||
                            document.querySelector('button[title*="Save" i]');
              if (saveBtn) {
                saveBtn.click();
                return 'save-clicked';
              }
              // List all buttons
              var btns = Array.from(document.querySelectorAll('button')).map(b => b.title || b.getAttribute('aria-label') || b.textContent.trim().slice(0,20));
              return 'no-save-btn;buttons=' + JSON.stringify(btns.slice(0,30));
            } catch(e) { return 'ERR: ' + e.message; }
          })()`,
          returnByValue: true
        });
        console.log('Save:', saveResult?.result?.value);
        await sleep(2000);

        console.log('--- Step 5: Add to chart ---');
        const addResult = await send('Runtime.evaluate', {
          expression: `(function(){
            try {
              var addBtn = document.querySelector('[data-name="add-to-chart"]') ||
                            document.querySelector('[data-name="pine-editor-toolbar"] [data-name="add-to-chart"]') ||
                            document.querySelector('button[aria-label*="Add" i]') ||
                            document.querySelector('button[title*="Add to chart" i]');
              if (addBtn) {
                addBtn.click();
                return 'add-clicked';
              }
              return 'no-add-btn';
            } catch(e) { return 'ERR: ' + e.message; }
          })()`,
          returnByValue: true
        });
        console.log('Add:', addResult?.result?.value);
        await sleep(3000);

        console.log('--- Step 6: Verify indikator muncul ---');
        // Cek apakah ada study baru
        const verify = await send('Runtime.evaluate', {
          expression: `(function(){
            try {
              var wv = window.TradingViewApi._activeChartWidgetWV.value();
              var studies = wv.getAllStudies ? wv.getAllStudies() : [];
              var found = studies.find(s => (s.name || '').indexOf('SMC') >= 0 || (s.name || '').indexOf('ICT') >= 0);
              if (found) return 'FOUND: ' + found.name + ' (id=' + found.id + ')';
              // List all studies
              var names = studies.map(s => s.name).join(', ');
              return 'NOT FOUND. Existing: ' + names;
            } catch(e) { return 'ERR: ' + e.message; }
          })()`,
          returnByValue: true
        });
        console.log('Verify:', verify?.result?.value);

      } catch(e) {
        console.log('ERR:', e.message);
      }
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => { console.error('HTTP ERR:', e.message); process.exit(1); });
