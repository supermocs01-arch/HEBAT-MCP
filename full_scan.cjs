const { execSync } = require('child_process');

// Step 1: Switch to XAUUSD
console.log('=== SWITCHING TO XAUUSD ===');
try {
  execSync('node C:\\HEBAT\\switch_symbol.cjs', { timeout: 15000 });
  console.log('Chart: XAUUSD ✓');
} catch {}

// Step 2: Cycle TF (warm-up)
console.log('\n=== WARM-UP PINE ===');
try {
  execSync('node C:\\HEBAT\\cycle_tf_efficient.cjs', { timeout: 60000 });
  console.log('PINE Warm-up ✓');
} catch {}

// Step 3: USDXAU Correlation
console.log('\n=== USDXAU CORRELATION ===');
try {
  const r = execSync('node C:\\HEBAT\\usdxau_correlation.cjs', { timeout: 60000 });
  console.log(r.toString());
} catch {}

// Step 4: Analisa Gabungan
console.log('\n=== ANALISA XAUUSD ===');
try {
  const r = execSync('node C:\\HEBAT\\analisa_gabungan.cjs', { timeout: 90000 });
  console.log(r.toString());
} catch {}

// Step 5: Baca PINE
console.log('\n=== PINE VERDICT ===');
try {
  const r = execSync('node C:\\HEBAT\\baca_pine.cjs', { timeout: 15000 });
  const lines = r.toString().split('\n');
  const pineLine = lines.find(l => l.includes('PINE_DATA'));
  if (pineLine) {
    const data = JSON.parse(pineLine.replace('PINE_DATA_JSON|', ''));
    console.log(`Signal : ${data.sig}`);
    console.log(`Ready  : ${data.ready}%`);
    console.log(`RSI    : ${data.rsi}`);
    console.log(`Zona   : ${data.zona}`);
    console.log(`MTF    : ${data.mtf}`);
    console.log(`Alasan : ${data.alasan}`);
  } else {
    console.log(lines[lines.length - 1] || 'NOT_FOUND');
  }
} catch {}

console.log('\n=== SCAN COMPLETE ===');
