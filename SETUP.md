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

1. Open TradingView Desktop
2. Open Pine Editor
3. Copy contents of `smc_swing_paten_v2.pine` and paste
4. Save/Add to chart

## Quick Start

```bash
# Health check
node C:\HEBAT\tradingview-mcp\src\cli\index.js status

# Run scan
node C:\HEBAT\analisa_gabungan.cjs

# Update overlay
node C:\HEBAT\overlay_position.cjs
```

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
| `smc_swing_paten_v2.pine` | Main indicator |

## Trading Pair
- XAUUSD (Gold)
- Broker: OANDA
- Account: Cent MT5
