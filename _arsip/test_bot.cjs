const { Bot, Api } = require('node-telegram-bot-api');

const fs = require('fs');
const path = require('path');

function loadEnvManual() {
    const envPath = path.join(__dirname, '.env');
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
const TELEGRAM_TOKEN = env.TELEGRAM_TOKEN;

console.log('Testing token:', TELEGRAM_TOKEN.substring(0, 10) + '...');

// Test with Api class directly
const api = new Api(TELEGRAM_TOKEN);

api.getMe().then(me => {
    console.log('✅ getMe SUCCESS:');
    console.log('   Bot username:', me.username);
    console.log('   Bot first_name:', me.first_name);
    console.log('   Bot id:', me.id);
    console.log('   Can join groups:', me.can_join_groups);
    console.log('   Can read all group messages:', me.can_read_all_group_messages);
    console.log('   Supports inline queries:', me.supports_inline_queries);
}).catch(err => {
    console.error('❌ getMe FAILED:', err.message);
    console.error('   Code:', err.code);
    console.error('   Response:', err.response?.body);
});

// Test with Bot class for polling
const bot = new Bot(TELEGRAM_TOKEN, { polling: true });

bot.on('polling_error', (e) => console.error('POLLING ERROR:', e.code, e.message));
bot.on('error', (e) => console.error('BOT ERROR:', e.message));

// Test receiving messages
bot.on('message', (msg) => {
    console.log('📩 RAW MESSAGE RECEIVED:', JSON.stringify(msg, null, 2));
});

console.log('Test bot running... waiting for messages...');