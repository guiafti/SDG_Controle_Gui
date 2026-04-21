import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { randomUUID } from 'node:crypto';

let db: Database.Database;

// Função para garantir que o banco seja instanciado apenas quando necessário
const getDb = () => {
  if (!db) {
    const isDev = !app.isPackaged;
    const dbPath = isDev 
      ? path.join(process.cwd(), 'local.db')
      : path.join(app.getPath('userData'), 'local.db');

    console.log('[BANCO] Utilizando better-sqlite3 em:', dbPath);
    db = new Database(dbPath, { verbose: isDev ? console.log : undefined });
    db.pragma('journal_mode = WAL');
  }
  return db;
};

export const query = async (sql: string, params: any[] = []): Promise<any[]> => {
  try {
    const stmt = getDb().prepare(sql);
    return stmt.all(...params);
  } catch (err) {
    console.error('[BANCO] Erro na query:', sql, err);
    throw err;
  }
};

export const get = async (sql: string, params: any[] = []): Promise<any> => {
  try {
    const stmt = getDb().prepare(sql);
    return stmt.get(...params);
  } catch (err) {
    console.error('[BANCO] Erro no get:', sql, err);
    throw err;
  }
};

export const run = async (sql: string, params: any[] = []): Promise<any> => {
  try {
    const stmt = getDb().prepare(sql);
    const info = stmt.run(...params);
    return { lastID: info.lastInsertRowid, changes: info.changes };
  } catch (err) {
    console.error('[BANCO] Erro no run:', sql, err);
    throw err;
  }
};

export const initDatabase = async () => {
  const database = getDb();
  console.log('[BANCO] Inicializando tabelas e migrações...');

  database.exec(`
    CREATE TABLE IF NOT EXISTS stores (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, archived INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'vendedor');
    CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, barcode TEXT UNIQUE, name TEXT NOT NULL, price REAL NOT NULL, archived INTEGER DEFAULT 0, synced INTEGER DEFAULT 0, image TEXT, category_id TEXT);
    CREATE TABLE IF NOT EXISTS inventory (product_id TEXT, store_id TEXT, quantity INTEGER DEFAULT 0, min_stock INTEGER DEFAULT 2, sale_tolerance_days INTEGER DEFAULT 30, PRIMARY KEY(product_id, store_id));
    CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, total REAL NOT NULL, payment_method TEXT NOT NULL, vendedor TEXT NOT NULL, store_id TEXT, items TEXT NOT NULL, discount REAL DEFAULT 0, synced INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS commissions (id TEXT PRIMARY KEY, sale_id TEXT, vendedor TEXT NOT NULL, value REAL NOT NULL, percentage REAL NOT NULL, status TEXT DEFAULT 'pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
  `);

  // Migrações básicas
  const migrations = [
    { table: 'stores', col: 'archived', type: 'INTEGER DEFAULT 0' },
    { table: 'products', col: 'archived', type: 'INTEGER DEFAULT 0' },
    { table: 'products', col: 'synced', type: 'INTEGER DEFAULT 0' },
    { table: 'products', col: 'image', type: 'TEXT' },
    { table: 'sales', col: 'synced', type: 'INTEGER DEFAULT 0' },
    { table: 'inventory', col: 'min_stock', type: 'INTEGER DEFAULT 2' },
    { table: 'inventory', col: 'sale_tolerance_days', type: 'INTEGER DEFAULT 30' }
  ];

  for (const m of migrations) {
    try {
      database.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.col} ${m.type}`);
    } catch (e) { /* Coluna já existe */ }
  }

  const storeCount: any = database.prepare('SELECT count(*) as count FROM stores').get();
  if (storeCount.count === 0) {
    database.prepare("INSERT INTO stores (id, name) VALUES ('1', 'Loja Centro'), ('2', 'Loja Avenida'), ('3', 'Loja Shopping')").run();
  }

  const userCount: any = database.prepare('SELECT count(*) as count FROM users').get();
  if (userCount.count === 0) {
    database.prepare('INSERT INTO users (id, name, password, role) VALUES (?, ?, ?, ?)').run(randomUUID(), 'Admin', 'admin', 'admin');
  }

  console.log('[BANCO] Inicialização concluída.');
};

export default { query, get, run, initDatabase };
