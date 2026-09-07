// diff_pine_editor.cjs - ambil isi editor dari DOM dan bandingkan dengan file
const fs = require('fs');
const http = require('http');
const src = fs.readFileSync('C:/HEBAT/tradingview-mcp/scripts/current.pine', 'utf8');
const srcLines = src.split('\n');

http.get('http://127.0.0.1:9222/json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    if (!t) { console.log('no chart'); process.exit(1); }
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) { return new Promise(r => { const mid = id++; const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); r(j.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); }); }
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      const r = await send('Runtime.evaluate', {
        expression: `(function(){var lines=document.querySelectorAll('.monaco-editor.pine-editor-monaco .view-lines .view-line');var txt='';for(var i=0;i<lines.length;i++)txt+=lines[i].textContent+'\\n';return txt})()`,
        returnByValue: true
      });
      const editorText = r.result && r.result.value ? r.result.value : '';
      const edLines = editorText.split('\n').filter(l => l.trim() !== '');
      console.log('EDITOR lines:', edLines.length, '| SRC lines:', srcLines.length);
      for (let i = 0; i < Math.min(edLines.length, srcLines.length); i++) {
        const a = srcLines[i].trim(), b = edLines[i].trim();
        if (a !== b) console.log('DIFF line ' + (i+1) + ':\n  SRC : [' + a + ']\n  EDIT: [' + b + ']');
      }
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));