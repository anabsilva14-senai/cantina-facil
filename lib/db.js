// Conexão com o banco. Com DATABASE_URL usa PostgreSQL (Neon). Sem ela, usa SQLite (só para testes/local).
let inst;
function pgDb(url) {
  const { Pool } = require('pg');
  const pool = globalThis.__cfPool || (globalThis.__cfPool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 3 }));
  const wrap = (c) => ({ query: async (sql, p = []) => { const r = await c.query(sql, p); return { rows: r.rows, rowCount: r.rowCount }; } });
  return {
    ...wrap(pool),
    async tx(fn) {
      const c = await pool.connect();
      try { await c.query('BEGIN'); const r = await fn(wrap(c)); await c.query('COMMIT'); return r; }
      catch (e) { try { await c.query('ROLLBACK'); } catch (_) {} throw e; }
      finally { c.release(); }
    }
  };
}
function sqliteDb(file) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(file);
  let chain = Promise.resolve();
  const run = (sql, p = []) => {
    const s = sql.replace(/\$(\d+)/g, '?$1');
    const st = db.prepare(s);
    if (/^\s*(SELECT|WITH)/i.test(s)) { const rows = st.all(...p); return { rows, rowCount: rows.length }; }
    const r = st.run(...p); return { rows: [], rowCount: Number(r.changes) };
  };
  const q = { query: async (s, p) => run(s, p) };
  return {
    query: q.query,
    tx(fn) {
      const res = chain.then(async () => {
        db.exec('BEGIN');
        try { const r = await fn(q); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
      });
      chain = res.catch(() => {});
      return res;
    }
  };
}
function getDb() {
  if (inst) return inst;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  inst = url ? pgDb(url) : sqliteDb(process.env.SQLITE_FILE || ':memory:');
  return inst;
}
module.exports = { getDb };
