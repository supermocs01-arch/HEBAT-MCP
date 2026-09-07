import { cpSync, rmSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

const srcDir = 'C:\\Program Files\\WindowsApps\\TradingView.Desktop_3.3.0.7992_x64__n534cwy3pjxzj';
const pkgName = srcDir.split('\\').pop();
const cacheRoot = join(process.env.LOCALAPPDATA, 'tradingview-mcp');
const dstDir = join(cacheRoot, pkgName);
const dstExe = join(dstDir, 'TradingView.exe');

async function probeCdp(port) {
  const r = await fetch(`http://127.0.0.1:${port}/json/version`).catch(() => null);
  if (r && r.ok) return JSON.stringify(await r.json());
  return null;
}

if (!existsSync(dstExe)) {
  console.log('Copying package to', dstDir);
  try {
    for (const entry of readdirSync(cacheRoot)) {
      if (entry !== pkgName && /^TradingView\./i.test(entry)) {
        rmSync(join(cacheRoot, entry), { recursive: true, force: true });
      }
    }
  } catch {}
  cpSync(srcDir, dstDir, { recursive: true });
}
console.log('Launching', dstExe);
try {
  const child = spawn(dstExe, ['--remote-debugging-port=9222'], { detached: true, stdio: 'ignore' });
  child.unref();
} catch (e) {
  console.log('Spawn error:', e.message);
  process.exit(1);
}

for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 1000));
  try {
    const info = await probeCdp(9222);
    if (info) { console.log('CDP READY:', info.slice(0, 200)); process.exit(0); }
  } catch {}
  console.log('waiting...', i + 1);
}
console.log('CDP not ready after 30s');
process.exit(1);