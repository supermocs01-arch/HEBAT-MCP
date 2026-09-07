const { execSync } = require('child_process');

const SYMBOL_USD = 'THINKMARKETS:USDINDEX';
const SYMBOL_XAU = 'OANDA:XAUUSD';

function getQuote(symbol) {
  try {
    const r = execSync(`node C:\\HEBAT\\tradingview-mcp\\src\\cli\\index.js quote --symbol ${symbol} 2>&1`, { timeout: 15000 });
    return JSON.parse(r.toString());
  } catch { return null; }
}

function getOHLCV(symbol, tf, count) {
  try {
    const r = execSync(`node C:\\HEBAT\\tradingview-mcp\\src\\cli\\index.js ohlcv --symbol ${symbol} --resolution ${tf} --count ${count} 2>&1`, { timeout: 15000 });
    return JSON.parse(r.toString());
  } catch { return null; }
}

function trend(bars) {
  if (!bars || !bars.bars || bars.bars.length < 5) return '?';
  const b = bars.bars.slice(-5);
  const move = b[b.length - 1].close - b[0].open;
  const range = b.reduce((s, x) => s + (x.high - x.low), 0) / b.length;
  if (range === 0) return 'FLAT';
  if (Math.abs(move) < range * 0.15) return 'FLAT';
  return move > 0 ? 'UP' : 'DOWN';
}

console.log('');
console.log('=== USDXAU SCAN ===');
console.log('');

const usdNow = getQuote(SYMBOL_USD);
const xauNow = getQuote(SYMBOL_XAU);

console.log(`USDIDX : ${usdNow ? usdNow.last : 'N/A'}`);
console.log(`XAUUSD : ${xauNow ? xauNow.last : 'N/A'}`);
console.log('');

console.log('STEP 1: USDIDX (arah Gold)');
console.log('------------------------');

const usdD1 = getOHLCV(SYMBOL_USD, '1440', 5);
const usdH4 = getOHLCV(SYMBOL_USD, '240', 5);
const usdH1 = getOHLCV(SYMBOL_USD, '60', 10);
const usdM15 = getOHLCV(SYMBOL_USD, '15', 15);
const usdM5 = getOHLCV(SYMBOL_USD, '5', 15);

const usdDirD1 = trend(usdD1);
const usdDirH4 = trend(usdH4);
const usdDirH1 = trend(usdH1);
const usdDirM15 = trend(usdM15);
const usdDirM5 = trend(usdM5);

console.log(`USD D1 : ${usdDirD1}`);
console.log(`USD H4 : ${usdDirH4}`);
console.log(`USD H1 : ${usdDirH1}`);
console.log(`USD M15: ${usdDirM15}`);
console.log(`USD M5 : ${usdDirM5}`);

// USD bias
const usdBias = usdDirD1 === 'UP' || usdDirH4 === 'UP' ? 'UP' : 
                usdDirD1 === 'DOWN' || usdDirH4 === 'DOWN' ? 'DOWN' : 'FLAT';

console.log(`=> USD Bias: ${usdBias}`);
console.log('');

console.log('STEP 2: XAUUSD (keputusan)');
console.log('---------------------------');

const xauD1 = getOHLCV(SYMBOL_XAU, '1440', 5);
const xauH4 = getOHLCV(SYMBOL_XAU, '240', 5);
const xauH1 = getOHLCV(SYMBOL_XAU, '60', 10);
const xauM15 = getOHLCV(SYMBOL_XAU, '15', 10);
const xauM5 = getOHLCV(SYMBOL_XAU, '5', 15);

const xauDirD1 = trend(xauD1);
const xauDirH4 = trend(xauH4);
const xauDirH1 = trend(xauH1);
const xauDirM15 = trend(xauM15);
const xauDirM5 = trend(xauM5);

console.log(`XAU D1 : ${xauDirD1}`);
console.log(`XAU H4 : ${xauDirH4}`);
console.log(`XAU H1 : ${xauDirH1}`);
console.log(`XAU M15: ${xauDirM15}`);
console.log(`XAU M5 : ${xauDirM5}`);

// XAU bias
const xauBias = xauDirD1 === 'UP' || xauDirH4 === 'UP' ? 'UP' : 
                xauDirD1 === 'DOWN' || xauDirH4 === 'DOWN' ? 'DOWN' : 'FLAT';

console.log(`=> XAU Bias: ${xauBias}`);
console.log('');

console.log('=== VERDICT ===');

if (usdBias === 'UP' && xauBias === 'DOWN') {
  console.log('[SELL] USD naik + Gold turun = confluence');
} else if (usdBias === 'DOWN' && xauBias === 'UP') {
  console.log('[BUY] USD turun + Gold naik = confluence');
} else if (usdBias === 'FLAT' || xauBias === 'FLAT') {
  console.log('[WAIT] Flat - tunggu');
} else if (usdBias === xauBias) {
  console.log(`[DIVERGING] USD ${usdBias}, XAU ${xauBias} = diverging`);
} else {
  console.log('[UNCLEAR]');
}

console.log('================');
