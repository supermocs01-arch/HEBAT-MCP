const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'events.json');
let cache = null;
let cacheAt = 0;

function load(force) {
  const now = Date.now();
  if (!force && cache && now - cacheAt < 30000) return cache;
  let raw = {};
  try { raw = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { raw = {}; }
  const events = (raw.events || []).map(e => ({
    id: e.id || 'evt',
    title: e.title || 'Event',
    at: e.at,
    impact: e.impact || 'high',
    block: e.block !== false,
    note: e.note || '',
    ts: new Date(e.at).getTime()
  })).filter(e => !isNaN(e.ts)).sort((a, b) => a.ts - b.ts);
  cache = { windowMinutes: Number(raw.window_minutes) || 30, events };
  cacheAt = now;
  return cache;
}

function activeWindow(nowTs) {
  const t = nowTs || Date.now();
  const { windowMinutes, events } = load();
  const w = windowMinutes * 60000;
  return events.find(e => e.block && Math.abs(t - e.ts) <= w) || null;
}

function nextEvent(nowTs) {
  const t = nowTs || Date.now();
  return load().events.find(e => e.ts >= t - 60000) || null;
}

function upcoming(n, nowTs) {
  const t = nowTs || Date.now();
  return load().events.filter(e => e.ts >= t - 60000).slice(0, n || 3);
}

function countdown(ms) {
  if (ms <= 0) return 'sekarang';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return d + 'h ' + h + 'j';
  if (h > 0) return h + 'j ' + m + 'm';
  return m + 'm';
}

function jamWib(ts) {
  try {
    return new Date(ts).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  } catch (e) {
    return new Date(ts).toISOString();
  }
}

function text(nowTs) {
  const t = nowTs || Date.now();
  const { windowMinutes } = load();
  const act = activeWindow(t);
  if (act) return 'JENDELA EVENT: ' + act.title + ' (+/-' + windowMinutes + ' mnt) - ENTRY DIBLOKIR';
  const nx = nextEvent(t);
  if (!nx) return 'Tidak ada event terjadwal';
  const dt = nx.ts - t;
  return 'EVENT BERIKUT: ' + nx.title + ' | ' + countdown(dt) + ' lagi (' + jamWib(nx.ts) + ' WIB)' + (dt <= 3600000 ? ' - HATI-HATI' : '');
}

module.exports = { load, activeWindow, nextEvent, upcoming, countdown, jamWib, text };
