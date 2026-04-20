import sqlite3 from 'sqlite3';
import path from 'path';
import { app } from 'electron';
import { randomUUID } from 'node:crypto'; // Use o prefixo 'node:' para garantir compatibilidade

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
  // ESTRUTURA: Lojas e Usuários
  await run(`CREATE TABLE IF NOT EXISTS stores (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL)`);
  await run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'vendedor'
  )`);
  
  // CATÁLOGO BLINDADO: Produtos higienizados (Foco em IDs e Matrizes)
  await run(`CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY, 
    barcode TEXT UNIQUE, 
    name TEXT NOT NULL, 
    price REAL NOT NULL, 
    image TEXT, 
    category_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced INTEGER DEFAULT 0,
    archived INTEGER DEFAULT 0
  )`);
  
  await run(`CREATE TABLE IF NOT EXISTS inventory (
    product_id TEXT, 
    store_id TEXT, 
    quantity INTEGER DEFAULT 0, 
    min_stock INTEGER DEFAULT 2, 
    PRIMARY KEY(product_id, store_id)
  )`);

  // LIVRO CAIXA (VENDAS): Registro exato e sem atrito
  await run(`CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY, 
    total REAL NOT NULL, 
    discount REAL DEFAULT 0,
    payment_method TEXT NOT NULL, 
    vendedor TEXT NOT NULL, 
    store_id TEXT, 
    items TEXT NOT NULL, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    synced INTEGER DEFAULT 0
  )`);

  // Migrações
  try {
    await run(`ALTER TABLE sales ADD COLUMN discount REAL DEFAULT 0`);
  } catch (e: any) {}

  try {
    await run(`ALTER TABLE products ADD COLUMN synced INTEGER DEFAULT 0`);
  } catch (e: any) {}

  try {
    await run(`ALTER TABLE products ADD COLUMN archived INTEGER DEFAULT 0`);
    console.log('[BANCO] Migração: Coluna archived adicionada na tabela products.');
  } catch (e: any) {
    if (!e.message.includes('duplicate column name')) {
      console.error('[BANCO] Erro ao adicionar coluna archived:', e);
    }
  }

  // ACERTO DE CONTAS: Comissões e Finanças Matemáticas
  await run(`CREATE TABLE IF NOT EXISTS commissions (
    id TEXT PRIMARY KEY,
    sale_id TEXT,
    vendedor TEXT NOT NULL,
    value REAL NOT NULL,
    percentage REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sale_id) REFERENCES sales(id)
  )`);

  // CONFIGURAÇÕES GERAIS: Cor, Logo e etc.
  await run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  const storeCount = await get('SELECT count(*) as count FROM stores');
  if (storeCount.count === 0) {
    await run('INSERT INTO stores (id, name) VALUES ("1", "Loja Centro"), ("2", "Loja Avenida"), ("3", "Loja Shopping")');
  }

  const userCount = await get('SELECT count(*) as count FROM users');
  if (userCount.count === 0) {
    await run('INSERT INTO users (id, name, password, role) VALUES (?, ?, ?, ?)', [randomUUID(), 'Carlos Silva', '1234', 'vendedor']);
    await run('INSERT INTO users (id, name, password, role) VALUES (?, ?, ?, ?)', [randomUUID(), 'Ana Beatriz', '1234', 'vendedor']);
    await run('INSERT INTO users (id, name, password, role) VALUES (?, ?, ?, ?)', [randomUUID(), 'Roberto Alves', '1234', 'vendedor']);
    await run('INSERT INTO users (id, name, password, role) VALUES (?, ?, ?, ?)', [randomUUID(), 'Admin', 'admin', 'admin']);
  }

  const productCount = await get('SELECT count(*) as count FROM products');
  if (productCount.count === 0) {
    const accessores = [
      ['Cabo iPhone Lightning 1M', '1001', 45.00],
      ['Carregador Turbo 20W Tipo-C', '1002', 89.90],
      ['Película 3D iPhone 13/14', '1003', 25.00],
      ['Capa Silicone iPhone 13 Black', '1004', 35.00],
      ['Fone Bluetooth AirDots 2', '1005', 120.00],
      ['Suporte Veicular Magnético', '1006', 29.90],
      ['Cabo USB-C para USB-C 2M', '1007', 49.00],
      ['Carregador Veicular 2 Portas', '1008', 39.00],
      ['Fone Ouvido P2 com Microfone', '1009', 19.90],
      ['Película Cerâmica iPhone 11', '1010', 30.00],
      ['Cabo Micro-USB 1M Resistente', '1011', 15.00],
      ['Cartão de Memória 64GB Classe 10', '1012', 55.00],
      ['Power Bank 10000mAh Slim', '1013', 149.00],
      ['Adaptador P2 para Tipo-C', '1014', 25.00],
      ['Anel Suporte Ring Holder Silver', '1015', 10.00]
    ];

    for (const [name, barcode, price] of accessores) {
      const id = randomUUID();
      await run('INSERT INTO products (id, barcode, name, price) VALUES (?, ?, ?, ?)', [id, barcode, name, price]);
      // Adicionar 100 unidades em cada uma das 3 lojas
      await run('INSERT INTO inventory (product_id, store_id, quantity) VALUES (?, "1", 100)', [id]);
      await run('INSERT INTO inventory (product_id, store_id, quantity) VALUES (?, "2", 100)', [id]);
      await run('INSERT INTO inventory (product_id, store_id, quantity) VALUES (?, "3", 100)', [id]);
    }
  }
};

export default db;