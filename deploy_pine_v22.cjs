// deploy_pine_v22.cjs - deploy smc_swing_paten_v2.pine ke editor TV + save + update chart
const fs = require('fs');
const http = require('http');
const src = fs.readFileSync('C:/HEBAT/smc_swing_paten_v2.pine', 'utf-8');
const CHUNK = 200;

http.get('http://127.0.0.1:9222/json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const t = JSON.parse(d).find(x => x.url && x.url.includes('/chart/'));
    if (!t) { console.log('no chart'); process.exit(1); }
    const ws = new (require('ws'))(t.webSocketDebuggerUrl);
    let id = 1;
    function send(m, p) { return new Promise(r => { const mid = id++; const h = raw => { const j = JSON.parse(raw.toString()); if (j.id === mid) { ws.removeListener('message', h); r(j.result); } }; ws.on('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); }); }
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    async function key(mod, key, code, vk) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: mod, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, location: 1, autoRepeat: false, isKeypad: false, isSystemKey: false });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: mod, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, location: 1, autoRepeat: false, isKeypad: false, isSystemKey: false });
    }
    async function evalJS(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      return r.result && r.result.value;
    }
    async function getReport() {
      return await evalJS(`(()=>{var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];if(!ed)return 'NO_EDITOR';var ia=ed.querySelector('.inputarea');var v=ia.value||'';return JSON.stringify({len:v.length,head:v.slice(0,40),tail:v.slice(-50)})})()`);
    }
    ws.on('open', async () => {
      await send('Page.enable'); await send('Runtime.enable');
      const pre = await getReport();
      console.log('editor sebelum:', pre);
      if (pre === 'NO_EDITOR') { console.log('GAGAL: editor Pine tidak ketemu (glitch lama?) - restart TV dulu'); process.exit(1); }
      // 1) fokus editor
      await evalJS(`(function(){var ed=document.querySelectorAll('.monaco-editor.pine-editor-monaco')[1];var ia=ed.querySelector('.inputarea');ia.focus();return 'focused'})()`);
      await sleep(300);
      // 2) kosongkan model
      await key(2, 'a', 'KeyA', 65); await sleep(400);
      await send('Input.insertText', { text: 'X' }); await sleep(400);
      await key(2, 'a', 'KeyA', 65); await sleep(300);
      await key(0, 'Backspace', 'Backspace', 8); await sleep(500);
      await key(2, 'End', 'End', 35); await sleep(400);
      // 3) ketik chunk
      for (let i = 0; i < src.length; i += CHUNK) {
        const part = src.slice(i, i + CHUNK);
        await send('Input.insertText', { text: part });
        await sleep(350);
        if (i % (CHUNK * 10) === 0) console.log('  progress', Math.min(i + CHUNK, src.length) + '/' + src.length);
      }
      await sleep(1500);
      const fin = JSON.parse(await getReport());
      console.log('final:', fin.len + ' | expected ' + src.length + ' | tail: ' + fin.tail);
      if (Math.abs(fin.len - src.length) > 40) { console.log('PERINGATAN: panjang editor beda jauh dari file - CEK MANUAL sebelum save!'); }
      // 4) Ctrl+S save
      await key(2, 'KeyS', 'KeyS', 83);
      await sleep(2500);
      console.log('after Ctrl+S:', await getReport());
      // 5) klik Update pada chart
      const r2 = await evalJS(`(function(){var b=document.querySelector('[title="Update pada chart"]')||document.querySelector('[title*="Update"]');if(!b)return 'not found';b.click();return 'clicked'})()`);
      console.log('update:', r2);
      await sleep(5000);
      console.log('DEPLOY SELESAI - cek chart: garis merah/hijau S/R harus muncul');
      ws.close();
      process.exit(0);
    });
  });
}).on('error', e => console.log('ERR:', e.message));
