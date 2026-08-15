import { getDatabase } from './connection';

interface Migration {
  name: string;
  up: string;
}

const migrations: Migration[] = [
  {
    name: '001_initial_schema',
    up: `
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        display_name TEXT,
        role TEXT NOT NULL DEFAULT 'staff',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        sku TEXT,
        barcode TEXT,
        category_id TEXT,
        price_cents INTEGER NOT NULL DEFAULT 0,
        cost_cents INTEGER NOT NULL DEFAULT 0,
        tax_rate_bps INTEGER NOT NULL DEFAULT 0,
        image_url TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS tables (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        section TEXT,
        capacity INTEGER NOT NULL DEFAULT 4,
        status TEXT NOT NULL DEFAULT 'available',
        position_x REAL,
        position_y REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number INTEGER NOT NULL,
        table_id TEXT,
        customer_id TEXT,
        order_type TEXT NOT NULL DEFAULT 'dine_in',
        status TEXT NOT NULL DEFAULT 'pending',
        subtotal_cents INTEGER NOT NULL DEFAULT 0,
        tax_cents INTEGER NOT NULL DEFAULT 0,
        discount_cents INTEGER NOT NULL DEFAULT 0,
        total_cents INTEGER NOT NULL DEFAULT 0,
        payment_status TEXT NOT NULL DEFAULT 'unpaid',
        payment_method TEXT,
        notes TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        name TEXT NOT NULL,
        quantity REAL NOT NULL DEFAULT 1,
        unit_price_cents INTEGER NOT NULL,
        total_price_cents INTEGER NOT NULL,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS inventory_items (
        id TEXT PRIMARY KEY,
        product_id TEXT,
        name TEXT NOT NULL,
        unit TEXT NOT NULL DEFAULT 'pcs',
        quantity_on_hand REAL NOT NULL DEFAULT 0,
        reorder_point REAL NOT NULL DEFAULT 0,
        reorder_quantity REAL NOT NULL DEFAULT 0,
        supplier_id TEXT,
        last_restock_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id TEXT PRIMARY KEY,
        inventory_item_id TEXT NOT NULL,
        type TEXT NOT NULL,
        quantity REAL NOT NULL,
        reference_id TEXT,
        notes TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'staff',
        hourly_rate_cents INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        hire_date TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS shifts (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        clock_in TEXT NOT NULL,
        clock_out TEXT,
        total_minutes INTEGER,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      );
    `,
  },
  {
    name: '002_sync_queue_v2',
    up: `
      DROP TABLE IF EXISTS sync_queue;

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT NOT NULL DEFAULT 'default',
        branch_id TEXT NOT NULL DEFAULT 'main',
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK(operation IN ('create', 'update', 'delete')),
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'conflict')),
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_error TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_workspace ON sync_queue(workspace_id, branch_id);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_retry ON sync_queue(retry_count);
    `,
  },
  {
    name: '003_repository_support',
    up: `
      -- ── Soft-delete support: add deleted_at to all entity tables ──

      ALTER TABLE products ADD COLUMN deleted_at TEXT;
      ALTER TABLE customers ADD COLUMN deleted_at TEXT;
      ALTER TABLE tables ADD COLUMN deleted_at TEXT;
      ALTER TABLE orders ADD COLUMN deleted_at TEXT;
      ALTER TABLE order_items ADD COLUMN deleted_at TEXT;
      ALTER TABLE inventory_items ADD COLUMN deleted_at TEXT;
      ALTER TABLE inventory_transactions ADD COLUMN deleted_at TEXT;
      ALTER TABLE employees ADD COLUMN deleted_at TEXT;
      ALTER TABLE shifts ADD COLUMN deleted_at TEXT;

      -- ── Optimistic versioning: add version column to all entity tables ──

      ALTER TABLE products ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE customers ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE tables ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE orders ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE order_items ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE inventory_items ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE inventory_transactions ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE employees ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE shifts ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

      -- ── Customer stats columns (denormalised for performance) ──

      ALTER TABLE customers ADD COLUMN total_orders INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE customers ADD COLUMN total_spent_cents INTEGER NOT NULL DEFAULT 0;

      -- ── Table current order assignment ──

      ALTER TABLE tables ADD COLUMN current_order_id TEXT;

      -- ── Payments table ──

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        method TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'paid',
        reference TEXT,
        notes TEXT,
        processed_by TEXT NOT NULL,
        deleted_at TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
      CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
      CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);

      -- ── Kitchen tickets table ──

      CREATE TABLE IF NOT EXISTS kitchen_tickets (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        order_number INTEGER NOT NULL,
        table_name TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'preparing', 'ready', 'completed')),
        priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal', 'rush', 'high')),
        notes TEXT,
        deleted_at TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_order ON kitchen_tickets(order_id);
      CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_status ON kitchen_tickets(status);

      -- ── Kitchen ticket items table ──

      CREATE TABLE IF NOT EXISTS kitchen_ticket_items (
        id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        quantity REAL NOT NULL DEFAULT 1,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'preparing', 'ready', 'completed')),
        deleted_at TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (ticket_id) REFERENCES kitchen_tickets(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_kitchen_ticket_items_ticket ON kitchen_ticket_items(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_kitchen_ticket_items_status ON kitchen_ticket_items(status);

      -- ── KDS display configs table ──

      CREATE TABLE IF NOT EXISTS kds_display_configs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category_ids TEXT NOT NULL DEFAULT '[]',
        is_active INTEGER NOT NULL DEFAULT 1,
        deleted_at TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- ── Deleted-at indexes for efficient soft-delete filtering ──

      CREATE INDEX IF NOT EXISTS idx_products_deleted ON products(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_customers_deleted ON customers(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_tables_deleted ON tables(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_orders_deleted ON orders(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_inventory_items_deleted ON inventory_items(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_employees_deleted ON employees(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_payments_deleted ON payments(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_deleted ON kitchen_tickets(deleted_at);
    `,
  },
  {
    name: '004_cancel_reason',
    up: `
      ALTER TABLE orders ADD COLUMN cancel_reason TEXT;
    `,
  },
];

export function runMigrations(): void {
  const db = getDatabase();

  // Ensure _migrations tracking table exists before querying it.
  // On a fresh database, this table does not exist yet — it is also created by
  // migration 001, but we need it NOW to check which migrations have been applied.
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set(
    db
      .prepare('SELECT name FROM _migrations')
      .all()
      .map((r: unknown) => (r as Record<string, string>).name),
  );

  console.log('[STARTUP] Previously applied migrations:', Array.from(applied));

  const runAll = db.transaction(() => {
    for (const migration of migrations) {
      if (!applied.has(migration.name)) {
        console.log('[STARTUP] Running migration:', migration.name);
        db.exec(migration.up);
        db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(migration.name);
      } else {
        console.log('[STARTUP] Skipping already-applied migration:', migration.name);
      }
    }
  });

  runAll();

  // Diagnostic: list all tables after migrations
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all()
    .map((r: unknown) => (r as Record<string, string>).name);
  console.log('[STARTUP] Tables after migration:', tables);
}
