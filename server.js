// Servidor local para testes (npm run dev). Na Vercel este arquivo não é usado.
const http = require('http'), fs = require('fs'), path = require('path');
const handler = require('./lib/handler');
const PUB = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api')) return handler(req, res);
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(PUB, path.normalize(p));
  if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end('Não encontrado'); }
  res.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
});
if (require.main === module) { const port = process.env.PORT || 3000; server.listen(port, () => console.log('Cantina Fácil em http://localhost:' + port)); }
module.exports = server;
