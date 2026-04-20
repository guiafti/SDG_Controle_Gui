import sqlite3 from 'sqlite3';
import path from 'path';
import { app } from 'electron';
import { randomUUID } from 'node:crypto';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

const dbPath = isDev 
  ? path.join(process.cwd(), 'local.db')
  : path.join(app.getPath('userData'), 'local.db');

console.log('[BANCO] Localização:', dbPath);
const db = new sqlite3.Database(dbPath);

export const query = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const get = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const run = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const initDatabase = async () => {
  console.log('[BANCO] Inicializando tabelas e migrações...');

  // 1. Criar tabelas base (definições mínimas)
  await run(`CREATE TABLE IF NOT EXISTS stores (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL)`);
  await run(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'vendedor')`);
  await run(`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, barcode TEXT UNIQUE, name TEXT NOT NULL, price REAL NOT NULL)`);
  await run(`CREATE TABLE IF NOT EXISTS inventory (product_id TEXT, store_id TEXT, quantity INTEGER DEFAULT 0, PRIMARY KEY(product_id, store_id))`);
  await run(`CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, total REAL NOT NULL, payment_method TEXT NOT NULL, vendedor TEXT NOT NULL, store_id TEXT, items TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await run(`CREATE TABLE IF NOT EXISTS commissions (id TEXT PRIMARY KEY, sale_id TEXT, vendedor TEXT NOT NULL, value REAL NOT NULL, percentage REAL NOT NULL, status TEXT DEFAULT 'pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);

  // 2. Migrações de Colunas (Adiciona se não existir)
  const migrate = async (table: string, column: string, type: string) => {
    try {
      await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      console.log(`[BANCO] Migração: Coluna ${column} adicionada em ${table}`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        console.error(`[BANCO] Erro ao migrar ${table}.${column}:`, e.message);
      }
    }
  };

  await migrate('stores', 'archived', 'INTEGER DEFAULT 0');
  await migrate('products', 'archived', 'INTEGER DEFAULT 0');
  await migrate('products', 'synced', 'INTEGER DEFAULT 0');
  await migrate('products', 'image', 'TEXT');
  await migrate('products', 'category_id', 'TEXT');
  await migrate('sales', 'discount', 'REAL DEFAULT 0');
  await migrate('sales', 'synced', 'INTEGER DEFAULT 0');
  await migrate('inventory', 'min_stock', 'INTEGER DEFAULT 2');
  await migrate('inventory', 'sale_tolerance_days', 'INTEGER DEFAULT 30');

  // 3. Dados Iniciais
  const storeCount = await get('SELECT count(*) as count FROM stores');
  if (storeCount.count === 0) {
    await run('INSERT INTO stores (id, name) VALUES ("1", "Loja Centro"), ("2", "Loja Avenida"), ("3", "Loja Shopping")');
  }

  const userCount = await get('SELECT count(*) as count FROM users');
  if (userCount.count === 0) {
    await run('INSERT INTO users (id, name, password, role) VALUES (?, ?, ?, ?)', [randomUUID(), 'Admin', 'admin', 'admin']);
  } else {
    await run('UPDATE users SET password = ?', ['admin']);
  }

  await run('ALTER TABLE stores ADD COLUMN archived INTEGER DEFAULT 0').catch(()=>{});
  await run('ALTER TABLE products ADD COLUMN archived INTEGER DEFAULT 0').catch(()=>{});
  
  console.log('[BANCO] Inicialização concluída.');
};

export default db;