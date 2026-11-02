// Halaman "Add App" + Terms, Privacy, dan Linked Roles untuk bot Discord.
// Butuh Node.js 18+, tanpa paket tambahan.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 6768;
const CLIENT_ID = process.env.CLIENT_ID || '1566757079509639228';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '';              // wajib untuk Linked Roles
const BASE_PATH = (process.env.BASE_PATH ?? '/discord').replace(/\/$/, ''); // folder di domain, '' kalau di root
const BASE_URL = (process.env.BASE_URL || `https://nekoread.nekoganz.my.id${BASE_PATH}`).replace(/\/$/, ''); // URL publik https
const REDIRECT_URI = `${BASE_URL}/oauth-callback`;

const INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&integration_type=0&scope=bot`;
const ACTIVITY_URL = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}`;

// File statis yang boleh diakses
const FILES = {
  '/invite': ['invite.html', 'text/html'],
  '/invite.html': ['invite.html', 'text/html'],
  '/terms': ['terms.html', 'text/html'],
  '/terms.html': ['terms.html', 'text/html'],
  '/privacy': ['privacy.html', 'text/html'],
  '/privacy.html': ['privacy.html', 'text/html'],
  '/style.css': ['style.css', 'text/css'],
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function page(res, status, title, body) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="color-scheme" content="dark" /><title>${esc(title)} — NekoRead</title><link rel="stylesheet" href="style.css" /></head><body><nav><div class="wrap"><a class="logo" href="invite.html">Neko<span>Read</span></a></div></nav><div class="wrap"><header class="doc"><h1>${esc(title)}</h1></header><div class="card">${body}</div></div><footer><a href="terms.html">Ketentuan Layanan</a> · <a href="privacy.html">Kebijakan Privasi</a></footer></body></html>`);
}

function getCookie(req, name) {
  const m = (req.headers.cookie || '').match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? m[1] : null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = url.pathname;
  if (BASE_PATH && (pathname === BASE_PATH || pathname.startsWith(`${BASE_PATH}/`))) pathname = pathname.slice(BASE_PATH.length) || '/';

  // Buka folder langsung diarahkan ke halaman invite
  if (pathname === '/' || pathname === '/index.html') { res.writeHead(302, { Location: `${BASE_PATH}/invite.html` }); return res.end(); }
  if (pathname === '/activity') { res.writeHead(302, { Location: ACTIVITY_URL }); return res.end(); }

  // ---- Linked Roles Verification URL: https://DOMAINMU/linked-roles ----
  if (pathname === '/linked-roles') {
    if (!CLIENT_SECRET) {
      return page(res, 500, 'Belum dikonfigurasi', '<p>CLIENT_SECRET belum diisi di server.</p>');
    }
    const state = crypto.randomUUID();
    const auth = new URL('https://discord.com/oauth2/authorize');
    auth.search = new URLSearchParams({
      client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, response_type: 'code',
      state, scope: 'role_connections.write identify', prompt: 'consent',
    });
    res.writeHead(302, {
      Location: auth.toString(),
      'Set-Cookie': `clientState=${state}; Max-Age=600; Path=/; HttpOnly; SameSite=Lax${BASE_URL.startsWith('https') ? '; Secure' : ''}`,
    });
    return res.end();
  }

  // ---- Redirect URI OAuth2 (daftarkan di Developer Portal → OAuth2) ----
  if (pathname === '/oauth-callback') {
    try {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      if (!code || !state || state !== getCookie(req, 'clientState')) {
        return page(res, 400, 'Verifikasi gagal', '<p>Sesi tidak valid atau sudah kedaluwarsa. Coba lagi dari Discord.</p>');
      }
      const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'authorization_code',
          code, redirect_uri: REDIRECT_URI,
        }),
      });
      if (!tokenRes.ok) throw new Error(`token ${tokenRes.status}`);
      const { access_token } = await tokenRes.json();

      const meRes = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: `Bearer ${access_token}` } });
      const me = meRes.ok ? await meRes.json() : {};

      const putRes = await fetch(`https://discord.com/api/v10/users/@me/applications/${CLIENT_ID}/role-connection`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform_name: 'NekoRead',
          platform_username: me.username || null,
          metadata: { terverifikasi: true },
        }),
      });
      if (!putRes.ok) throw new Error(`role-connection ${putRes.status}`);

      return page(res, 200, 'Berhasil terhubung',
        `<p>Akun <b>${esc(me.username || 'kamu')}</b> sudah terhubung ke NekoRead. Kamu boleh menutup halaman ini dan kembali ke Discord.</p>`);
    } catch (err) {
      console.error('oauth-callback:', err.message);
      return page(res, 500, 'Terjadi kesalahan', '<p>Gagal menyelesaikan verifikasi. Coba lagi beberapa saat lagi.</p>');
    }
  }

  const file = FILES[pathname];
  if (file) {
    return fs.readFile(path.join(__dirname, file[0]), (err, data) => {
      if (err) { res.writeHead(500); return res.end('Gagal memuat file'); }
      res.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8` });
      res.end(data);
    });
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 - Halaman tidak ditemukan');
});

server.listen(PORT, () => {
  console.log(`Jalan di ${BASE_URL} (port ${PORT})`);
  console.log(`Terms: ${BASE_URL}/terms | Privacy: ${BASE_URL}/privacy | Linked Roles: ${BASE_URL}/linked-roles`);
});
