const fs = require('fs');
const file = 'C:/HEBAT/smc_ict_unified_v1.pine';
let content = fs.readFileSync(file, 'utf8');

// Find the alert section and replace it
const oldAlert = `// ============ ALERT ` + `—` + ` JSON siap webhook ================================`;
// Just replace the whole alert section to be safe

const searchStr = '// ============ ALERT ' + '\u2014' + ' JSON siap webhook ================================';
const idx = content.indexOf(searchStr);
if (idx === -1) {
  console.log('Alert header not found');
  process.exit(1);
}
console.log('Found at index:', idx);

// Replace from there to end of file
const newAlert = `// ============ ALERT ` + '\u2014' + ` JSON siap webhook ================================
// alert_message(): format JSON untuk dikirim via TradingView alert webhook.
// Skema:
//   {"sig":"BUY","px":4310.4,"sl":4225,"tp1":4374,"tp2":4458,
//    "alasan":"BUY_VALID","zona":"DISKON","sesi":"LONDON",
//    "kz":"LONDON","po3":"DIST","judas":"-",
//    "mtf_placeholder":"M15=BULL","t":1725287400}
//
// PENTING: Field "mtf" di sini PLACEHOLDER (semua TF = M15 trend).
// Analyzer Node.js (baca_pine_json.cjs + scan_all_tf.cjs) yang akan
// replace dengan data akurat dari cycle TF. Jangan trade berdasarkan
// "mtf" dari alert ini sebelum analyzer mereplace.
if buyValid
    alert_message = '{"sig":"BUY","px":' + str.tostring(close) + ',"sl":' + str.tostring(slSug, "#.#") + ',"tp1":' + str.tostring(tp1Sug, "#.#") + ',"tp2":' + str.tostring(tp2Sug, "#.#") + ',"alasan":"BUY_VALID","zona":"DISKON","sesi":"' + sesiStr + '","kz":"' + kzStr + '","po3":"' + po3 + '","judas":"-","mtf_placeholder":"M15=' + m15Trend + '","tf_aktif":"' + timeframe.period + '","t":' + str.tostring(time) + '}'
    alert(alert_message, alert.freq_once_per_bar_close)
if sellValid
    alert_message = '{"sig":"SELL","px":' + str.tostring(close) + ',"sl":' + str.tostring(slSug, "#.#") + ',"tp1":' + str.tostring(tp1Sug, "#.#") + ',"tp2":' + str.tostring(tp2Sug, "#.#") + ',"alasan":"SELL_VALID","zona":"PREMIUM","sesi":"' + sesiStr + '","kz":"' + kzStr + '","po3":"' + po3 + '","judas":"-","mtf_placeholder":"M15=' + m15Trend + '","tf_aktif":"' + timeframe.period + '","t":' + str.tostring(time) + '}'
    alert(alert_message, alert.freq_once_per_bar_close)
if judasBull
    alert("JUDAS_BEAR @ " + str.tostring(close) + " (sweep high di awal sesi " + '\u2014' + " waspada SELL)", alert.freq_once_per_bar_close)
if judasBear
    alert("JUDAS_BULL @ " + str.tostring(close) + " (sweep low di awal sesi " + '\u2014' + " waspada BUY)", alert.freq_once_per_bar_close)
// =====================================================================
// END SMC` + '\u00d7' + `ICT Unified v1.0
// =====================================================================`;

const newContent = content.substring(0, idx) + newAlert;
fs.writeFileSync(file, newContent);
console.log('Done. File updated.');

// Verify
const verify = fs.readFileSync(file, 'utf8');
console.log('Last 500 chars:');
console.log(verify.substring(verify.length - 500));
