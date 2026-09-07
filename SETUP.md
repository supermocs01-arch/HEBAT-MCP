# HEBAT MCP - Setup Guide

## Prerequisites

1. **Node.js** (v16+)
   - Download: https://nodejs.org/
   - Install and restart terminal

2. **Git**
   - Download: https://git-scm.com/
   - For cloning the repo

3. **TradingView Desktop**
   - Download from https://tradingview.com/
   - Install and log in

## First Time Setup

### 1. Clone Repo

```bash
git clone https://github.com/supermocs01-arch/HEBAT-MCP.git
cd HEBAT-MCP
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Git Config

```bash
git config user.email "your-email@example.com"
git config user.name "Your Name"
```

### 4. Deploy Pine Script

1. Open **TradingView Desktop**
2. Open chart **XAUUSD** (recommended: M15)
3. Press **F3** or click Pine Editor at bottom panel
4. Open file `smc_ict_unified_v1.pine` in text editor
5. **Copy ALL contents**
6. **Paste** into Pine Editor
7. Click **"Add to Chart"** (bottom right)

You should see "SMC×ICT v1.1 OK" at top right of chart.

### 5. First Run Commands

```bash
# 1. Verify TV connection
node C:\HEBAT\tradingview-mcp\src\cli\index.js status

# 2. Warm up PINE (IMPORTANT - fixes HTF data)
node C:\HEBAT\cycle_tf_efficient.cjs

# 3. Run market analysis
node C:\HEBAT\analisa_gabungan.cjs

# 4. Update chart overlay
node C:\HEBAT\overlay_position.cjs
```

## Daily Usage

### Manual Start

```bash
# Full startup: TV check + overlay + scan
node C:\HEBAT\hi_fitra.cjs

# Just scan market
node C:\HEBAT\analisa_gabungan.cjs

# Just update overlay
node C:\HEBAT\overlay_position.cjs

# Cycle TF (after TV restart)
node C:\HEBAT\cycle_tf_efficient.cjs
```

### Auto-Start Watcher (Recommended)

Run once when PC starts - it runs in background:

```bash
node C:\HEBAT\auto_start_watch.cjs
```

What it does:
- Monitors TV Desktop every 15 seconds
- If TV restarts → auto-run: cycle TF → overlay → scan
- Starts position monitor
- Prevents duplicate monitors (lock file)

## Path Configuration

Some scripts have hardcoded paths. Edit if you change directory:

### `overlay_position.cjs` (lines 4-6)
```javascript
const OV = JSON.parse(fs.readFileSync('C:/HEBAT/overlay_plan.json', 'utf8'));
const P  = JSON.parse(fs.readFileSync('C:/HEBAT/posisi.json', 'utf8'));
```

### `monitor_limit_xau.cjs`
Check for any `C:\HEBAT\` paths

## Pine Script Versions

### v1.1 (Recommended - Bug Fixed)
- File: `smc_ict_unified_v1.pine`
- Features: Fixed PINE none bug, robust MTF detection
- **Use this version**

### v1.0 (Legacy)
- File: `smc_swing_paten_v2.pine`
- Older version, some bugs

## File Overview

| File | Purpose |
|------|---------|
| `PATEN.md` | Core trading rules (MANDATORY READ) |
| `pelajaran_sl.md` | MISS #1-#14 from losses |
| `pengetahuan_fibo.md` | Fibonacci rules |
| `KNOWLEDGE_BASE.md` | Full system docs |
| `hitung.cjs` | Risk calculator |
| `analisa_gabungan.cjs` | Market analysis |
| `overlay_position.cjs` | Chart overlay |
| `monitor_limit_xau.cjs` | Position monitor |
| `cycle_tf_efficient.cjs` | TF warm-up |
| `auto_start_watch.cjs` | Auto-start watcher |

## Troubleshooting

### "PINE shows FLAT/none"
```bash
node C:\HEBAT\cycle_tf_efficient.cjs
```

### "Overlay not appearing"
```bash
node C:\HEBAT\overlay_position.cjs
```

### "Monitor errors"
```bash
# Check if monitor is running
type C:\HEBAT\monitor.lock

# Restart monitor
node C:\HEBAT\monitor_limit_xau.cjs
```

### TV not connecting
```bash
# Check TV status
node C:\HEBAT\tradingview-mcp\src\cli\index.js status

# Kill and restart TV
taskkill /F /IM TradingView.exe
node C:\HEBAT\hi_fitra.cjs
```

## System Architecture

```
TradingView Desktop (CDP :9222)
    ↓
smc_ict_unified_v1.pine (on chart)
    ↓ (CDP WebSocket)
Node.js Analyzers
    ├── cycle_tf_efficient.cjs (warm-up)
    ├── baca_pine_json.cjs (read PINE labels)
    ├── scan_all_tf.cjs (all TF scan)
    ├── analisa_gabungan.cjs (full analysis)
    ├── overlay_position.cjs (chart panel)
    └── monitor_limit_xau.cjs (position monitor)
    ↓
Overlay on chart + Trade decisions
```

## Support

- Check `KNOWLEDGE_BASE.md` for full documentation
- Check `pelajaran_sl.md` for trading lessons
- Ask AI assistant with context of your `posisi.json` and `entry_hari.json`
