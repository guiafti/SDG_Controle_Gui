import sqlite3 from 'sqlite3';
import path from 'path';
import { app } from 'electron';

const dbPath = process.env.NODE_ENV === 'development' 
  ? path.join(__dirname, '../../local.db')
  : path.join(app.getPath('userData'), 'local.db');

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
  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      barcode TEXT UNIQUE,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      image TEXT,
      stock INTEGER DEFAULT 0,
      category_id INTEGER
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL,
      vendedor TEXT NOT NULL,
      loja TEXT NOT NULL,
      items TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0
    )
  `);

  const countRow = await get('SELECT count(*) as count FROM products');
  if (countRow.count === 0) {
    await run('INSERT INTO products (id, barcode, name, price, image) VALUES (?, ?, ?, ?, ?)', ['1', '123', 'Smartphone XYZ 128GB', 2500.00, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=150&h=150&fit=crop']);
    await run('INSERT INTO products (id, barcode, name, price, image) VALUES (?, ?, ?, ?, ?)', ['2', '456', 'Cabo Carregador Turbo 2M', 45.90, 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=150&h=150&fit=crop']);
    await run('INSERT INTO products (id, barcode, name, price, image) VALUES (?, ?, ?, ?, ?)', ['3', '789', 'Fone Bluetooth Pro Noise Cancelling', 350.00, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&h=150&fit=crop']);
    await run('INSERT INTO products (id, barcode, name, price, image) VALUES (?, ?, ?, ?, ?)', ['4', '111', 'Película de Vidro 3D', 25.00, 'https://images.unsplash.com/photo-1541560052-5e137f229371?w=150&h=150&fit=crop']);
  }
};

export default db;