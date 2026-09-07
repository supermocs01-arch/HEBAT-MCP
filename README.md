# HEBAT MCP - SMC×ICT Trading System

> Sistem trading gabungan SMC + ICT untuk XAUUSD. Built by Fitra with AI assistance.

## 🎯 Overview

| Item | Value |
|------|-------|
| **Target** | XAUUSD (Gold) |
| **Broker** | OANDA Cent MT5 |
| **Account** | ~2,000 USC |
| **Pine Version** | v1.1 (7 Sep 2026) |
| **Strategy** | Paten Fitra + ICT Kill Zones |

## ⚡ Quick Start (First Time Setup)

### Step 1: Clone & Install

```bash
# Clone repo
git clone https://github.com/supermocs01-arch/HEBAT-MCP.git
cd HEBAT-MCP

# Install dependencies
npm install
```

### Step 2: Install Node.js (if not installed)

Download from https://nodejs.org/ (version 16 or higher)

### Step 3: Deploy Pine Script

1. **Open TradingView Desktop**
2. **Open chart XAUUSD** (any timeframe, recommended M15)
3. **Press F3** or click Pine Editor at bottom
4. **Copy ALL contents** of `smc_ict_unified_v1.pine`
5. **Paste** into Pine Editor
6. **Click "Add to chart"** (bottom right)

You should see "SMC×ICT v1.1 OK" at top right of chart.

### Step 4: First Run

```bash
# Health check - verify TV connection
node C:\HEBAT\tradingview-mcp\src\cli\index.js status

# Cycle TF (warm-up PINE - IMPORTANT after first deploy!)
node C:\HEBAT\cycle_tf_efficient.cjs

# Run market analysis
node C:\HEBAT\analisa_gabungan.cjs

# Update overlay on chart
node C:\HEBAT\overlay_position.cjs
```

### Step 5: (Optional) Auto-Start Watcher

Run this once when PC starts - it auto-detects TV restart:

```bash
node C:\HEBAT\auto_start_watch.cjs
```

## 🔄 Daily Usage

```bash
# Morning startup - full sequence
node C:\HEBAT\hi_fitra.cjs

# Or individual commands:
node C:\HEBAT\analisa_gabungan.cjs    # Scan market
node C:\HEBAT\overlay_position.cjs     # Update chart overlay
node C:\HEBAT\cycle_tf_efficient.cjs   # Refresh PINE (after TV restart)
```

## 📁 File Structure

| File | Purpose |
|------|---------|
| `smc_ict_unified_v1.pine` | **Main Pine Script** - Deploy to TradingView |
| `PATEN.md` | Core trading rules |
| `pelajaran_sl.md` | Lessons from losses (MISS #1-#14) |
| `pengetahuan_fibo.md` | Fibonacci knowledge |
| `KNOWLEDGE_BASE.md` | Complete system documentation |
| `AGENTS.md` | AI agent instructions |
| `hitung.cjs` | Risk calculator |
| `analisa_gabungan.cjs` | Market analysis (PINE + SMC + ICT) |
| `overlay_position.cjs` | Chart overlay panel |
| `monitor_limit_xau.cjs` | Position monitor |
| `cycle_tf_efficient.cjs` | TF warm-up (fixes PINE none bug) |
| `auto_start_watch.cjs` | Auto-run on TV restart |
| `hi_fitra.cjs` | Full startup sequence |

## 🐛 Bug Fixes (v1.1)

### PINE `request.security()` NA Bug

**Problem:** `request.security()` for HTF (D1/H4/H1) returns NA after TV restart.

**Solution (v1.1):**
1. EMA-based MTF trend detection (more robust)
2. Last-known-value pattern with `var` cache
3. Auto-cycle TF via `cycle_tf_efficient.cjs` on TV restart

**How it works:**
```
TV Restart → auto_start_watch.cjs detects → cycle_tf_efficient.cjs runs
→ cycles through D→240→60→30→15→5 → PINE populates all TF
```

## 🎨 Features

### Built-in Visual Indicators
- **SMC**: BOS, CHoCH, FVG, Order Blocks, Sweeps
- **ICT**: Kill Zones, Silver Bullet, Judas Swing, OTE
- **Fibonacci**: 61.8%, 78.6%, OTE zones
- **MTF Table**: Trend per timeframe
- **Auto SL/TP**: Suggested levels per trade

### Automated Tasks
- Chart overlay with position/Layer info
- Position monitoring with glitch filter
- Market analysis with verdict engine
- Alert-ready JSON output

## ⚠️ Important Rules

1. **Max 3 entries/day** - Stop after 2 losses
2. **BUY only at DISKON** (below mid range)
3. **SELL only if D1 BEARISH + PREMIUM**
4. **Structural SL** - Outside sweep/swing + buffer, NOT 10 pips fixed
5. **Entry requires confirmation**: PINE M15 signal + CHoCH + candle

## 📖 Documentation

| File | Read First |
|------|------------|
| `PATEN.md` | Core rules (read this first!) |
| `pelajaran_sl.md` | All lessons from losses |
| `pengetahuan_fibo.md` | Fibonacci zones |
| `KNOWLEDGE_BASE.md` | Consolidated system docs |
| `SETUP.md` | Detailed setup guide |

## 🆘 Troubleshooting

### "PINE shows none"
```bash
# Run cycle TF to warm up
node C:\HEBAT\cycle_tf_efficient.cjs
```

### "Overlay not showing"
```bash
# Re-run overlay
node C:\HEBAT\overlay_position.cjs
```

### "Monitor not running"
```bash
# Check lock
type C:\HEBAT\monitor.lock

# Restart monitor
node C:\HEBAT\monitor_limit_xau.cjs
```

### TV connection issues
```bash
# Verify TV is running with CDP
node C:\HEBAT\tradingview-mcp\src\cli\index.js status

# If failed, restart TV and run
node C:\HEBAT\hi_fitra.cjs
```

---

**Built with ❤️ by Fitra + AI (Fatra)**
