-- Tabelas do banco (PostgreSQL). O sistema também cria isto sozinho na primeira vez que roda.

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price_cents INTEGER NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    initial_stock INTEGER NOT NULL DEFAULT 0
  );

CREATE TABLE IF NOT EXISTS combos (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    main_id INTEGER NOT NULL,
    price_cents INTEGER NOT NULL
  );

CREATE TABLE IF NOT EXISTS orders (
    num INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    turma TEXT,
    code TEXT NOT NULL,
    status INTEGER NOT NULL DEFAULT 0,
    pickup TEXT NOT NULL DEFAULT 'now',
    break_at TEXT,
    subtotal_cents INTEGER NOT NULL,
    discount_cents INTEGER NOT NULL,
    total_cents INTEGER NOT NULL,
    cancel_reason TEXT,
    altered INTEGER NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL,
    ready_at BIGINT
  );

CREATE TABLE IF NOT EXISTS order_items (
    order_num INTEGER NOT NULL,
    item_key TEXT NOT NULL,
    qty INTEGER NOT NULL,
    PRIMARY KEY (order_num, item_key)
  );

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
