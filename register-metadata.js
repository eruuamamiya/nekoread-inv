// Jalankan SEKALI untuk mendaftarkan metadata Linked Roles:
//   BOT_TOKEN=xxxx node register-metadata.js
const CLIENT_ID = process.env.CLIENT_ID || '1566757079509639228';
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) { console.error('Isi BOT_TOKEN dulu.'); process.exit(1); }

fetch(`https://discord.com/api/v10/applications/${CLIENT_ID}/role-connection-metadata`, {
  method: 'PUT',
  headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify([
    { key: 'terverifikasi', name: 'Terverifikasi', description: 'Akun sudah terhubung ke NekoRead', type: 7 },
  ]),
}).then(async (r) => console.log(r.status, await r.text()));
