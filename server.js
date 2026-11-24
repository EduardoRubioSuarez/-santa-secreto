// Santa Secreto en local: node server.js (sin dependencias). Para Vercel ver api/[...path].js
const http = require('http');
const fs = require('fs');
const path = require('path');
const { api, load, adminKey } = require('./app');

const PORT = process.env.PORT || 3000;
const PUB = path.join(__dirname, 'public');

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) return api(req, res);
  const file = url.pathname === '/' ? 'index.html' : url.pathname === '/admin' ? 'admin.html' : null;
  if (!file) { res.writeHead(404); return res.end('No existe'); }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(fs.readFileSync(path.join(PUB, file)));
}).listen(PORT, async () => {
  const d = await load();
  console.log(`Santa Secreto en http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin   clave: ${adminKey(d)}`);
});
