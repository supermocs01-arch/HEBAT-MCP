# HEBAT MCP - Setup Guide

## Prerequisites

1. **Node.js** (v16+)
   - Download: https://nodejs.org/

2. **Git**
   - Download: https://git-scm.com/

3. **TradingView Desktop**
   - Install TradingView from official site
   - Enable Chrome DevTools Protocol (CDP) on port 9222

## Clone & Setup

```bash
# 1. Clone repo
git clone https://github.com/supermocs01-arch/HEBAT-MCP.git
cd HEBAT-MCP

# 2. Install dependencies
npm install

# 3. Setup git config (if needed)
git config user.email "your-email@example.com"
git config user.name "Your Name"

# 4. Edit path in scripts (see below)
```

## Path Configuration

Edit these files to match your directory:

### `overlay_position.cjs` (line 4-6)
```javascript
const OV = JSON.parse(fs.readFileSync('C:/HEBAT/overlay_plan.json', 'utf8'));
const P  = JSON.parse(fs.readFileSync('C:/HEBAT/posisi.json', 'utf8'));
```

### `analisa_gabungan.cjs`
Check for any hardcoded paths and update accordingly.

### `monitor_limit_xau.cjs`
Check for any hardcoded paths and update accordingly.

## Deploy Pine Script

### Option 1: SMC×ICT Unified v1.0 (Recommended - Full Feature)
1. Open TradingView Desktop
2. Open Pine Editor (bottom panel or press F3)
3. Copy ALL contents of `smc_ict_unified_v1.pine` and paste
4. Click **"Add to chart"** (bawah kanan)
5. Indicator akan muncul otomatis dengan nama "SMC×ICT Unified v1"

**Fitur utama:**
- SMC klasik (BOS/CHoCH/FVG/OB)
- ICT (Kill Zones, Silver Bullet, Judas Swing, OTE, Power of 3)
- Fibonacci retracement + extension
- Multi-timeframe trend table
- Auto SL/TP suggestion
- Alert ready (JSON output)

### Option 2: SMC Swing Paten v2.2 (Legacy)
1. Open Pine Editor
2. Copy contents of `smc_swing_paten_v2.pine`
3. Add to chart

## Quick Start

```bash
# Health check
node C:\HEBAT\tradingview-mcp\src\cli\index.js status

# Run scan
node C:\HEBAT\analisa_gabungan.cjs

# Update overlay
node C:\HEBAT\overlay_position.cjs

# Cycle TF (fix PINE none after restart) - runs automatically on TV start
node C:\HEBAT\cycle_tf_efficient.cjs
```

## Auto-Start Watcher (Background)

Jalankan sekali saat PC menyala:
```bash
node C:\HEBAT\auto_start_watch.cjs
```

Ini akan:
1. Pantau TV Desktop terus-menerus
2. Kalau TV restart → auto **cycle TF** + overlay + scan
3. Auto start monitor posisi
4. Anti-monitor-dobel (lock file)

## File Structure

| File | Purpose |
|------|---------|
| `PATEN.md` | Core trading rules |
| `pelajaran_sl.md` | Lesson history (MISS #1-#14) |
| `pengetahuan_fibo.md` | Fibonacci knowledge |
| `KNOWLEDGE_BASE.md` | Full system documentation |
| `AGENTS.md` | AI agent instructions |
| `hitung.cjs` | Risk calculator |
| `analisa_gabungan.cjs` | Market analysis |
| `overlay_position.cjs` | Chart overlay panel |
| `monitor_limit_xau.cjs` | Position monitor |
| `hi_fitra.cjs` | Full startup |
| `smc_ict_unified_v1.pine` | Main indicator (SMC + ICT unified) |

## Trading Pair
- XAUUSD (Gold)
- Broker: OANDA
- Account: Cent MT5
