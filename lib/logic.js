// Regras do sistema. Valores em centavos no banco; a API devolve em reais.
const SCHEMA = require('./schema');
const JUICES = [4, 5];
const PRODUCTS = [
  [1, 'Sanduíche natural', 'Peito de peru, queijo branco e salada', 'Lanches', 600, 6],
  [2, 'Misto quente', 'Queijo e presunto no pão de forma', 'Lanches', 550, 5],
  [3, 'Pão de queijo', 'Porção com 4 unidades', 'Salgados', 350, 10],
  [9, 'Coxinha de frango', 'Frita na hora, bem recheada', 'Salgados', 500, 10],
  [10, 'Pastel assado de queijo', 'Massa crocante, queijo derretido', 'Salgados', 500, 2],
  [4, 'Suco de laranja', 'Copo de 300 ml, natural', 'Bebidas', 400, 8],
  [5, 'Suco de uva', 'Copo de 300 ml, gelado', 'Bebidas', 400, 8],
  [6, 'Água mineral', 'Garrafa de 500 ml', 'Bebidas', 250, 12],
  [11, 'Achocolatado', 'Caixinha de 200 ml', 'Bebidas', 300, 10],
  [7, 'Bolo de cenoura', 'Fatia com cobertura de chocolate', 'Doces', 450, 0],
  [8, 'Salada de frutas', 'Porção com frutas da estação', 'Doces', 500, 4],
  [12, 'Maçã', 'Fruta inteira, bem fresquinha', 'Doces', 250, 8]
];
const COMBOS = [[1, 'Combo Intervalo', 1, 900], [2, 'Combo Quentinho', 2, 850], [3, 'Combo Lanchinho', 3, 650]];

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const E = (s, m) => new HttpError(s, m);

async function init(db) {
  for (const s of SCHEMA) await db.query(s);
  for (const p of PRODUCTS) await db.query('INSERT INTO products (id,name,description,category,price_cents,stock,initial_stock) VALUES ($1,$2,$3,$4,$5,$6,$6) ON CONFLICT (id) DO NOTHING', p);
  for (const c of COMBOS) await db.query('INSERT INTO combos (id,name,main_id,price_cents) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING', c);
}
async function catalog(q) {
  const cat = { products: {}, combos: {} };
  (await q.query('SELECT id,name,price_cents,stock FROM products')).rows.forEach(r => cat.products[r.id] = { id: +r.id, name: r.name, price: +r.price_cents, stock: +r.stock });
  (await q.query('SELECT id,name,main_id,price_cents FROM combos')).rows.forEach(r => cat.combos[r.id] = { id: +r.id, name: r.name, main: +r.main_id, price: +r.price_cents });
  return cat;
}
function partsOf(key, cat) {
  if (key[0] === 'p') return [+key.slice(1)];
  const [c, j] = key.slice(1).split(':').map(Number);
  return [cat.combos[c].main, j];
}
function parseItems(raw, cat) {
  if (!raw || typeof raw !== 'object') throw E(400, 'Pedido sem itens.');
  const items = {}, demand = {}; let sub = 0;
  for (const [k, qv] of Object.entries(raw)) {
    const qty = Number(qv);
    if (!Number.isInteger(qty) || qty < 1 || qty > 30) throw E(400, 'Quantidade inválida.');
    let ids, price;
    if (/^p\d+$/.test(k)) { const p = cat.products[+k.slice(1)]; if (!p) throw E(400, 'Item inválido.'); ids = [p.id]; price = p.price; }
    else if (/^c\d+:\d+$/.test(k)) {
      const [c, j] = k.slice(1).split(':').map(Number); const cb = cat.combos[c];
      if (!cb || !JUICES.includes(j)) throw E(400, 'Combo inválido.');
      ids = [cb.main, j]; price = cb.price;
    } else throw E(400, 'Item inválido.');
    items[k] = qty; ids.forEach(i => demand[i] = (demand[i] || 0) + qty); sub += price * qty;
  }
  if (!Object.keys(items).length) throw E(400, 'Pedido sem itens.');
  return { items, demand, sub };
}
async function take(q, demand, cat) {
  for (const [id, n] of Object.entries(demand)) {
    const r = await q.query('UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1', [n, +id]);
    if (r.rowCount !== 1) throw E(409, 'Acabou: ' + cat.products[id].name + '.');
  }
}
async function give(q, items, cat) {
  for (const [k, qty] of Object.entries(items)) for (const id of partsOf(k, cat)) await q.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [qty, id]);
}
async function loadOrder(q, num) {
  const r = (await q.query('SELECT * FROM orders WHERE num = $1', [num])).rows[0];
  if (!r) throw E(404, 'Pedido não encontrado.');
  const items = {};
  (await q.query('SELECT item_key, qty FROM order_items WHERE order_num = $1', [num])).rows.forEach(i => items[i.item_key] = +i.qty);
  return map(r, items);
}
function map(r, items) {
  return { num: +r.num, name: r.name, turma: r.turma || '', code: r.code, st: +r.status, when: r.pickup, at: r.break_at || '',
    sub: r.subtotal_cents / 100, disc: r.discount_cents / 100, total: r.total_cents / 100, why: r.cancel_reason || '',
    alt: !!+r.altered, t: +r.created_at, tr: r.ready_at ? +r.ready_at : null, items };
}
const clean = (s, n) => String(s == null ? '' : s).replace(/[<>]/g, '').trim().slice(0, n);
async function retry(fn) {
  for (let i = 0; ; i++) { try { return await fn(); } catch (e) { if (i < 4 && /duplicate|unique/i.test(String(e.message))) continue; throw e; } }
}
async function writeItems(q, num, items) {
  await q.query('DELETE FROM order_items WHERE order_num = $1', [num]);
  for (const [k, n] of Object.entries(items)) await q.query('INSERT INTO order_items (order_num,item_key,qty) VALUES ($1,$2,$3)', [num, k, n]);
}
const pickup = (b) => ({ when: b.when === 'break' ? 'break' : 'now', at: /^\d\d:\d\d$/.test(b.at || '') ? b.at : null });

async function createOrder(db, b, opt = {}) {
  const name = clean(b.name, 60), turma = clean(b.turma, 20);
  if (name.length < 2) throw E(400, 'Informe o nome.');
  return retry(() => db.tx(async (q) => {
    const cat = await catalog(q);
    const { items, demand, sub } = parseItems(b.items, cat);
    await take(q, demand, cat);
    const disc = Math.round(sub * 0.10), pk = pickup(b);
    const num = +(await q.query('SELECT COALESCE(MAX(num),0)+1 AS n FROM orders')).rows[0].n;
    const code = String(Math.floor(1000 + Math.random() * 9000));
    await q.query('INSERT INTO orders (num,name,turma,code,status,pickup,break_at,subtotal_cents,discount_cents,total_cents,altered,created_at) VALUES ($1,$2,$3,$4,0,$5,$6,$7,$8,$9,0,$10)',
      [num, name, turma, code, pk.when, pk.at, sub, disc, sub - disc, opt.createdAt || Date.now()]);
    await writeItems(q, num, items);
    return { num, code };
  }));
}
// Troca os itens de um pedido (aluno com código, ou atendente). Devolve o estoque antigo e baixa o novo.
async function replaceItems(db, num, raw, check, extra = {}) {
  return db.tx(async (q) => {
    const o = await loadOrder(q, num); check(o);
    const cat = await catalog(q);
    const { items, demand, sub } = parseItems(raw, cat);
    await give(q, o.items, cat);
    await take(q, demand, cat);
    const disc = Math.round(sub * 0.10);
    await writeItems(q, num, items);
    const pk = extra.pickup ? pickup(extra.pickup) : { when: o.when, at: o.at || null };
    await q.query('UPDATE orders SET subtotal_cents=$1, discount_cents=$2, total_cents=$3, altered=1, pickup=$4, break_at=$5 WHERE num=$6', [sub, disc, sub - disc, pk.when, pk.at, num]);
    return { num };
  });
}
const editByStudent = (db, num, code, b) => replaceItems(db, num, b.items, (o) => {
  if (o.code !== String(code)) throw E(403, 'Código inválido.');
  if (o.st !== 0) throw E(409, 'Seu pedido já entrou em preparo e não pode mais ser alterado.');
}, { pickup: b });
const editByAttendant = (db, num, raw) => replaceItems(db, num, raw, (o) => { if (o.st > 1) throw E(409, 'Este pedido não pode mais ser editado.'); });

async function cancel(db, num, { code, reason, att }) {
  return db.tx(async (q) => {
    const o = await loadOrder(q, num);
    if (!att && o.code !== String(code)) throw E(403, 'Código inválido.');
    if (att ? o.st > 2 : o.st !== 0) throw E(409, att ? 'Este pedido já foi entregue ou cancelado.' : 'Seu pedido já entrou em preparo e não pode mais ser cancelado pelo app.');
    await give(q, o.items, await catalog(q));
    await q.query('UPDATE orders SET status=4, cancel_reason=$1 WHERE num=$2', [att ? clean(reason, 200) || 'A cantina cancelou o pedido.' : 'Você cancelou o pedido.', num]);
    return { num };
  });
}
async function setStatus(db, num, to) {
  return db.tx(async (q) => {
    const o = await loadOrder(q, num);
    const ok = (o.st === 0 && to === 1) || (o.st === 1 && to === 2) || (o.st === 3 && to === 2);
    if (!ok) throw E(409, 'Mudança de situação não permitida.');
    await q.query('UPDATE orders SET status=$1, ready_at=$2 WHERE num=$3', [to, to === 2 ? Date.now() : null, num]);
    return { num };
  });
}
async function deliver(db, num, code) {
  return db.tx(async (q) => {
    const o = await loadOrder(q, num);
    if (o.st !== 2) throw E(409, 'O pedido ainda não está pronto.');
    if (o.code !== String(code || '').trim()) throw E(400, 'Código não confere. Peça o código ao estudante.');
    await q.query('UPDATE orders SET status=3 WHERE num=$1', [num]);
    return { num };
  });
}
async function setStock(db, id, n) {
  n = Number(n);
  if (!Number.isInteger(n) || n < 0 || n > 999) throw E(400, 'Estoque inválido.');
  const r = await db.query('UPDATE products SET stock=$1 WHERE id=$2', [n, id]);
  if (r.rowCount !== 1) throw E(404, 'Produto não encontrado.');
  return { id, stock: n };
}
async function demo(db) {
  const nomes = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe'], pick = (a) => a[Math.floor(Math.random() * a.length)];
  for (let i = 0; i < 3; i++) {
    try { await createOrder(db, { name: pick(nomes), turma: '7º A', items: { ['p' + pick([1, 2, 3, 9])]: 1, ['p' + pick([4, 5, 11])]: 1 }, when: 'now' }, { createdAt: Date.now() - Math.floor(Math.random() * 9) * 60000 }); }
    catch (e) { if (e.status !== 409) throw e; }
  }
  return { ok: true };
}
async function reset(db) {
  return db.tx(async (q) => {
    await q.query('DELETE FROM order_items'); await q.query('DELETE FROM orders');
    await q.query('UPDATE products SET stock = initial_stock');
    return { ok: true };
  });
}
// Estado que o site consulta a cada poucos segundos.
async function state(db, { num, code, att, name, turma }) {
  const cat = await catalog(db);
  const stock = {}, prices = {}, combos = {};
  Object.values(cat.products).forEach(p => { stock[p.id] = p.stock; prices[p.id] = p.price; });
  Object.values(cat.combos).forEach(c => combos[c.id] = c.price);
  const open = (await db.query('SELECT num,status FROM orders WHERE status < 3 ORDER BY num')).rows;
  const board = { prep: open.filter(o => +o.status < 2).map(o => +o.num), rdy: open.filter(o => +o.status === 2).map(o => +o.num) };
  let pop = globalThis.__cfPop;
  if (!pop || Date.now() - pop.t > 20000) {
    const n = {};
    (await db.query('SELECT i.item_key, i.qty FROM order_items i JOIN orders o ON o.num = i.order_num WHERE o.status <> 4')).rows
      .forEach(r => partsOf(r.item_key, cat).forEach(id => n[id] = (n[id] || 0) + +r.qty));
    pop = globalThis.__cfPop = { t: Date.now(), v: [1, 9, 4, 3, 2, 5].sort((a, b) => (n[b] || 0) - (n[a] || 0)).slice(0, 3) };
  }
  const out = { stock, prices, combos, queue: board.prep.length, pop: pop.v, board, mine: null };
  // 1) pedido guardado no aparelho (número + código). 2) se não houver, ou já foi entregue/cancelado,
  // procura o pedido mais recente das últimas 12 h pelo nome + turma (recupera quem saiu ou trocou de aparelho).
  let mine = null;
  if (num && /^\d+$/.test(String(num))) {
    try {
      const o = await loadOrder(db, +num);
      if (o.code === String(code)) mine = o;
    } catch (e) { if (e.status !== 404) throw e; }
  }
  const nm = clean(name, 60);
  if ((!mine || mine.st >= 3) && nm.length >= 2) {
    const r = (await db.query(
      "SELECT num FROM orders WHERE LOWER(name) = LOWER($1) AND LOWER(COALESCE(turma, '')) = LOWER($2) AND created_at > $3 ORDER BY num DESC LIMIT 1",
      [nm, clean(turma, 20), Date.now() - 12 * 3600 * 1000])).rows[0];
    if (r && (!mine || +r.num !== mine.num)) mine = await loadOrder(db, +r.num);
  }
  if (mine) { mine.ahead = board.prep.filter(n => n < mine.num).length; out.mine = mine; }
  if (att) {
    const rows = (await db.query('SELECT * FROM orders ORDER BY num')).rows;
    const its = {}; (await db.query('SELECT order_num,item_key,qty FROM order_items')).rows.forEach(i => (its[i.order_num] = its[i.order_num] || {})[i.item_key] = +i.qty);
    out.orders = rows.map(r => map(r, its[r.num] || {}));
  }
  return out;
}
module.exports = { init, createOrder, editByStudent, editByAttendant, cancel, setStatus, deliver, setStock, demo, reset, state, HttpError, E };