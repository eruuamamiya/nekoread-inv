// Bot NekoRead: bikin bot online + status "Sedang bermain ...".
// Jalankan: BOT_TOKEN=... node bot.js  (atau lewat pm2, lihat ecosystem.config.js)
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');

const TOKEN = (process.env.BOT_TOKEN || '').trim();
const STATUS_TEXT = process.env.STATUS_TEXT || 'NekoRead';
if (!TOKEN) { console.error('Isi BOT_TOKEN dulu.'); process.exit(1); }

const client = new Client({ intents: [GatewayIntentBits.Guilds] }); // tanpa intent khusus

client.once('clientReady', (c) => {
  console.log(`Bot online sebagai ${c.user.tag} di ${c.guilds.cache.size} server`);
  c.user.setPresence({
    status: 'online',
    activities: [{ name: STATUS_TEXT, type: ActivityType.Playing }],
  });
});

client.on('error', (e) => console.error('client error:', e.message));
process.on('unhandledRejection', (e) => console.error('unhandled:', e));

client.login(TOKEN).catch((e) => { console.error('Login gagal:', e.message); process.exit(1); });
