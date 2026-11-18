// Recebe as requisições /api/* e chama as regras em logic.js.
const crypto = require('crypto');
const L = require('./logic');
const { getDb } = require('./db');
const PIN = () => process.env.ATTENDANT_PIN || '1234';
const SECRET = () => process.env.TOKEN_SECRET || 'troque-este-segredo-em-producao';

const sign = (p) => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', SECRET()).update(b).digest('base64url'); };
function verify(t) {
  if (!t) return null;
  const [b, s] = String(t).split('.'); if (!b || !s) return null;
  const e = crypto.createHmac('sha256', SECRET()).update(b).digest('base64url');
  if (e.length !== s.length || !crypto.timingSafeEqual(Buffer.from(e), Buffer.from(s))) return null;
  try { const p = JSON.parse(Buffer.from(b, 'base64url').toString()); return p.exp > Date.now() ? p : null; } catch (_) { return null; }
}
async function readBody(req) {
  if (req.body !== undefined && req.body !== null) return typeof req.body === 'string' ? (req.body ? JSON.parse(req.body) : {}) : req.body;
  const chunks = []; for await (const c of req) chunks.push(c);
  const s = Buffer.concat(chunks).toString(); return s ? JSON.parse(s) : {};
}
function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}
async function ready(db) {
  if (!globalThis.__cfReady) globalThis.__cfReady = L.init(db).catch((e) => { globalThis.__cfReady = null; throw e; });
  return globalThis.__cfReady;
}
const attOnly = (att) => { if (!att) throw L.E(401, 'Entre como atendente para fazer isso.'); };

module.exports = async function handler(req, res) {
  try {
    const db = getDb(); await ready(db);
    const url = new URL(req.url, 'http://x');
    const path = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
    const m = req.method, seg = path.split('/');
    const att = !!verify((req.headers.authorization || '').replace(/^Bearer /, ''));
    const body = (m === 'POST' || m === 'PUT') ? await readBody(req) : {};

    if (m === 'GET' && path === 'state') return send(res, 200, await L.state(db, { num: url.searchParams.get('num'), code: url.searchParams.get('code'), name: url.searchParams.get('name'), turma: url.searchParams.get('turma'), att }));
    if (m === 'POST' && path === 'login') {
      if (String(body.pin || '') !== PIN()) throw L.E(401, 'PIN incorreto.');
      return send(res, 200, { token: sign({ r: 'att', exp: Date.now() + 12 * 3600 * 1000 }) });
    }
    if (m === 'POST' && path === 'orders') return send(res, 201, await L.createOrder(db, body));
    if (seg[0] === 'orders' && /^\d+$/.test(seg[1] || '')) {
      const num = +seg[1], act = seg[2];
      if (m === 'PUT' && !act) return send(res, 200, await L.editByStudent(db, num, body.code, body));
      if (m === 'POST' && act === 'cancel') return send(res, 200, await L.cancel(db, num, { code: body.code, reason: body.reason, att }));
      if (m === 'POST' && act === 'status') { attOnly(att); return send(res, 200, await L.setStatus(db, num, Number(body.status))); }
      if (m === 'POST' && act === 'deliver') { attOnly(att); return send(res, 200, await L.deliver(db, num, body.code)); }
      if (m === 'PUT' && act === 'items') { attOnly(att); return send(res, 200, await L.editByAttendant(db, num, body.items)); }
    }
    if (m === 'POST' && seg[0] === 'products' && seg[2] === 'stock') { attOnly(att); return send(res, 200, await L.setStock(db, +seg[1], body.stock)); }
    if (m === 'POST' && path === 'demo') { attOnly(att); return send(res, 200, await L.demo(db)); }
    if (m === 'POST' && path === 'reset') { attOnly(att); return send(res, 200, await L.reset(db)); }
    send(res, 404, { error: 'Rota não encontrada.' });
  } catch (e) {
    if (e instanceof L.HttpError) return send(res, e.status, { error: e.message });
    if (e instanceof SyntaxError) return send(res, 400, { error: 'Requisição inválida.' });
    console.error(e);
    send(res, 500, { error: 'Erro no servidor. Confira a conexão com o banco de dados.' });
  }
};