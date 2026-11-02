// Server Activity: menyajikan hasil build (dist/) dan menukar code -> access_token.
// Node 18+, tanpa paket tambahan. Jalankan: CLIENT_SECRET=... node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 6769;
const CLIENT_ID = process.env.CLIENT_ID || '1566757079509639228';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '';
const DIST = path.join(__dirname, 'dist');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

const send = (res, code, type, body) => { res.writeHead(code, { 'Content-Type': `${type}; charset=utf-8` }); res.end(body); };

http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && pathname === '/api/token') {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 4096) req.destroy(); });
    req.on('end', async () => {
      try {
        const { code } = JSON.parse(raw || '{}');
        if (!code || !CLIENT_SECRET) return send(res, 400, 'application/json', '{"error":"bad request"}');
        const r = await fetch('https://discord.com/api/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'authorization_code', code }),
        });
        const data = await r.json();
        if (!r.ok) return send(res, 400, 'application/json', '{"error":"token ditolak"}');
        send(res, 200, 'application/json', JSON.stringify({ access_token: data.access_token }));
      } catch (e) {
        send(res, 500, 'application/json', '{"error":"server error"}');
      }
    });
    return;
  }

  // File statis dari dist/
  const file = path.normalize(path.join(DIST, pathname === '/' ? 'index.html' : pathname));
  if (!file.startsWith(DIST)) return send(res, 403, 'text/plain', 'Forbidden');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'text/plain', '404');
    res.writeHead(200, { 'Content-Type': `${MIME[path.extname(file)] || 'application/octet-stream'}; charset=utf-8` });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Activity jalan di port ${PORT}`));
