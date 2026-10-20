const { Bot } = require('node-telegram-bot-api');
const fs = require('fs');

console.log('[1] Baca .env...');
const env = fs.readFileSync('.env', 'utf8');
const token = env.match(/TELEGRAM_TOKEN=(.+)/)[1].trim();
console.log('[2] Token:', token.substring(0, 15) + '...');

console.log('[3] Buat bot instance (v2 API)...');
const bot = new Bot(token);

console.log('[4] Register handler...');
bot.on('message', (msg) => {
  console.log('📩 PESAN MASUK:', msg.from.id, '|', msg.text);
});

bot.on('polling_error', (err) => {
  console.error('❌ POLLING ERROR:', err.code, err.message);
});

bot.on('error', (err) => {
  console.error('❌ BOT ERROR:', err.message);
});

console.log('[5] Semua handler terdaftar. Mulai polling...');
bot.startPolling().then(() => {
  console.log('[6] ✅ Polling aktif. Bot siap.');
  console.log('[7] Cek: apakah prompt kembali? Kalau ya → proses exit salah.');
}).catch(err => {
  console.error('❌ Gagal startPolling:', err.message);
});