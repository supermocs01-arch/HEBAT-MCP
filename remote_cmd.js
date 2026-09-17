// ============================================================
// HEBAT Remote Telegram Bridge — Anti-Glitch Edition
// ============================================================
// Section [1] Manual .env Loader
// ============================================================
const fs = require('fs');
const path = require('path');

function loadEnvManual() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        console.error('❌ File .env tidak ditemukan di:', envPath);
        process.exit(1);
    }
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    const env = {};
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
            env[match[1].trim()] = match[2].trim();
        }
    }
    return env;
}

const env = loadEnvManual();

// ============================================================
// Section [2] Config Constants
// ============================================================
const TELEGRAM_TOKEN = env.TELEGRAM_TOKEN;
const ALLOWED_USER_ID = env.ALLOWED_USER_ID ? parseInt(env.ALLOWED_USER_ID, 10) : null;

if (!TELEGRAM_TOKEN || TELEGRAM_TOKEN.includes('ISI_TOKEN')) {
    console.error('❌ TELEGRAM_TOKEN belum diisi di .env');
    process.exit(1);
}
if (!ALLOWED_USER_ID || isNaN(ALLOWED_USER_ID)) {
    console.error('❌ ALLOWED_USER_ID belum diisi atau bukan angka di .env');
    process.exit(1);
}

// ============================================================
// Section [3] ANSI Filter Function
// ============================================================
function stripAnsi(str) {
    // Hapus escape sequence ANSI: \x1b[...m, \u001b[...m, dll
    return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
              .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '')
              .replace(/\x1b\][^\x07]*\x07/g, '')
              .replace(/\u001b\][^\x07]*\x07/g, '');
}

// ============================================================
// Section [4] Glitch Buffer Filter Function
// ============================================================
function processOutput(rawOutput) {
    const cleaned = stripAnsi(rawOutput);
    
    if (cleaned.length > 6000) {
        // Kirim sebagai file .txt
        return { type: 'document', content: cleaned };
    }
    
    if (cleaned.length > 4000) {
        // Potong 3900 char terakhir + tambah peringatan
        const truncated = cleaned.slice(-3900);
        return { 
            type: 'text', 
            content: truncated + '\n\n⚠️ [OUTPUT TERPOTONG - melebihi batas Telegram 4096 char]' 
        };
    }
    
    return { type: 'text', content: cleaned };
}

// ============================================================
// Section [5] Command Whitelist Validator
// ============================================================
function isCommandAllowed(cmd) {
    const trimmed = cmd.trim();
    // Hanya izinkan: node <file>.cjs atau node <file>.js
    const allowedPattern = /^node\s+[\w\/\\.-]+\.(cjs|js)(\s+.*)?$/i;
    
    if (!allowedPattern.test(trimmed)) {
        return false;
    }
    
    // Blacklist tambahan untuk keamanan
    const dangerous = [
        'rm ', 'del ', 'format', 'shutdown', 'reboot',
        'taskkill', 'powershell', 'cmd ', 'bash ', 'sh ',
        'curl ', 'wget ', 'nc ', 'netcat', 'ssh ',
        '>', '>>', '|', '&&', '||', ';'
    ];
    
    const lowerCmd = trimmed.toLowerCase();
    for (const danger of dangerous) {
        if (lowerCmd.includes(danger)) {
            return false;
        }
    }
    
    return true;
}

// ============================================================
// Section [6] Bot Init + Polling Error Handler
// ============================================================
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Handler error polling — auto-retry, jangan crash
bot.on('polling_error', (error) => {
    const fatalCodes = ['EFATAL', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED'];
    const isFatal = fatalCodes.some(code => error.code && error.code.includes(code));
    
    if (isFatal) {
        console.warn(`⚠️ Polling error (${error.code}): ${error.message} — Mencoba reconnect...`);
        // node-telegram-bot-api sudah handle reconnect otomatis untuk polling
        // Cukup log, jangan throw
    } else {
        console.error('❌ Polling error tidak dikenal:', error.message);
    }
});

bot.on('error', (error) => {
    console.error('❌ Bot error:', error.message);
});

// Startup logger
console.log(`✅ HEBAT Remote Bridge AKTIF - Menunggu perintah dari User ID: ${ALLOWED_USER_ID}`);

// ============================================================
// Section [7] Message Handler
// ============================================================
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    
    // Security gate: HANYA ALLOWED_USER_ID
    if (userId !== ALLOWED_USER_ID) {
        // Ignore total, jangan balas apapun
        return;
    }
    
    if (!text || !text.startsWith('node ')) {
        // Bukan command node, abaikan
        return;
    }
    
    // Validasi whitelist
    if (!isCommandAllowed(text)) {
        await bot.sendMessage(chatId, '⛔ Command tidak diizinkan. Hanya `node <file>.cjs|.js` yang diperbolehkan.', { parse_mode: 'Markdown' });
        return;
    }
    
    // Loading indicator
    let loadingMsg;
    try {
        loadingMsg = await bot.sendMessage(chatId, '⏳ Mengeksekusi...');
    } catch (e) {
        console.error('Gagal kirim loading:', e.message);
    }
    
    const loadingMsgId = loadingMsg?.message_id;
    
    // Eksekusi command
    const { exec } = require('child_process');
    const execOptions = {
        cwd: __dirname,  // Kunci ke __dirname, bukan hardcoded
        timeout: 90000,  // 90 detik
        maxBuffer: 1024 * 1024 * 10  // 10MB buffer
    };
    
    exec(text, execOptions, async (error, stdout, stderr) => {
        let output = stdout;
        if (stderr) output += '\n' + stderr;
        if (error) {
            if (error.killed && error.signal === 'SIGTERM') {
                output += '\n⏱️ Eksekusi timeout (>90s)';
            } else {
                output += '\n❌ Error: ' + error.message;
            }
        }
        
        const processed = processOutput(output);
        
        // Kirim hasil
        try {
            if (processed.type === 'document') {
                // Kirim sebagai file
                const tempFile = path.join(__dirname, 'output_' + Date.now() + '.txt');
                fs.writeFileSync(tempFile, processed.content);
                await bot.sendDocument(chatId, tempFile, { caption: '📄 Output panjang (>6000 char)' });
                fs.unlinkSync(tempFile);
            } else {
                // Edit loading message dengan hasil
                await safeEditMessageText(chatId, loadingMsgId, processed.content);
            }
        } catch (sendError) {
            console.error('Gagal kirim hasil:', sendError.message);
            // Fallback: kirim message baru
            try {
                if (processed.type === 'document') {
                    const tempFile = path.join(__dirname, 'output_' + Date.now() + '.txt');
                    fs.writeFileSync(tempFile, processed.content);
                    await bot.sendDocument(chatId, tempFile, { caption: '📄 Output panjang (>6000 char)' });
                    fs.unlinkSync(tempFile);
                } else {
                    await bot.sendMessage(chatId, processed.content);
                }
            } catch (e2) {
                console.error('Gagal total kirim hasil:', e2.message);
            }
        }
    });
});

// ============================================================
// Section [8] Markdown-safe editMessageText Wrapper
// ============================================================
async function safeEditMessageText(chatId, messageId, text) {
    // Coba dengan Markdown dulu
    try {
        await bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown'
        });
        return;
    } catch (mdError) {
        // Markdown gagal, coba tanpa parse_mode (plain text)
        try {
            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId
                // parse_mode undefined = plain text
            });
            return;
        } catch (plainError) {
            console.error('editMessageText gagal total:', plainError.message);
            throw plainError;
        }
    }
}

/*
============================================================
CONTOH PEMAKAIAN:
============================================================
1. Isi .env dengan token bot & user ID Telegram Anda
2. Jalankan: node remote_cmd.js
3. Dari HP, kirim pesan ke bot:
   node analisa_gabungan.cjs
4. Bot akan balas dengan hasil analisis XAUUSD (bersih ANSI, anti-glitch)
5. Command lain yang diizinkan:
   node monitor_limit_xau.cjs
   node overlay_position.cjs
   node verify_overlay_dom.cjs
   node hi_fitra.cjs
============================================================
*/