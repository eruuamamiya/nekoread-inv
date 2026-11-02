// Jalankan SEKALI untuk mendaftarkan metadata Linked Roles:
//   BOT_TOKEN=xxxx node register-metadata.js
const FALLBACK_ID = '1566757079509639228';
const BOT_TOKEN = (process.env.BOT_TOKEN || '').trim();
if (!BOT_TOKEN) { console.error('Isi BOT_TOKEN dulu.'); process.exit(1); }

const API = 'https://discord.com/api/v10';
const headers = { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' };

(async () => {
  // Ambil ID aplikasi dari token; kalau gagal, pakai ID bawaan
  let id = FALLBACK_ID;
  try {
    const me = await fetch(`${API}/applications/@me`, { headers });
    const app = await me.json();
    if (me.ok) { id = app.id; console.log(`Aplikasi dari token: ${app.name} (${app.id})`); }
    else console.warn(`Cek token gagal (${me.status}), pakai ID ${id}`);
  } catch (e) { console.warn('Cek token gagal, pakai ID', id); }

  // Endpoint yang benar: /role-connections/metadata
  const r = await fetch(`${API}/applications/${id}/role-connections/metadata`, {
    method: 'PUT',
    headers,
    body: JSON.stringify([
      { key: 'terverifikasi', name: 'Terverifikasi', description: 'Akun sudah terhubung ke NekoRead', type: 7 },
    ]),
  });
  console.log(r.status, await r.text());
})();
