import { app, BrowserWindow, ipcMain, protocol, net, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';
import { initDatabase, get, run, query } from './database';
import { GuardianProtocol } from './GuardianProtocol';
import { SyncEngine } from './SyncEngine';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const LOG_FILE = path.join(app.getPath('userData'), 'error.log');
const logError = (msg: string) => {
  const time = new Date().toISOString();
  try { fs.appendFileSync(LOG_FILE, `[${time}] ${msg}\n`); } catch (e) {}
  console.error(msg);
};

let supabaseClient: any = null;
const getSupabase = () => {
  if (supabaseClient) return supabaseClient;
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_ANON_KEY || '';
  if (url && url !== 'SUA_URL_DO_SUPABASE_AQUI' && url !== '') {
    supabaseClient = createClient(url, key);
    return supabaseClient;
  }
  return null;
};

process.on('uncaughtException', (error) => {
  logError(`FALHA CRÍTICA: ${error.message}`);
  // app.quit(); // Evitar fechar em erro não fatal de rede
});

protocol.registerSchemesAsPrivileged([{ scheme: 'local-img', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

let UPLOAD_PATH = '';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200, height: 800, frame: false, titleBarStyle: 'hidden',
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js') }
  });
  if (!app.isPackaged) {
    win.loadURL('http://127.0.0.1:5173');
    // win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '..', 'index.html'));
  }
}

app.whenReady().then(async () => {
  const envPath = app.isPackaged ? path.join(process.resourcesPath, '.env') : path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath });

  UPLOAD_PATH = path.join(app.getPath('userData'), 'product_images');
  if (!fs.existsSync(UPLOAD_PATH)) fs.mkdirSync(UPLOAD_PATH, { recursive: true });

  protocol.handle('local-img', (request) => {
    const fileName = path.basename(decodeURIComponent(request.url.replace('local-img://', '')));
    const filePath = path.join(UPLOAD_PATH, fileName);
    if (!fs.existsSync(filePath)) return new Response('Not Found', { status: 404 });
    return net.fetch(pathToFileURL(filePath).toString());
  });

  await initDatabase();
  createWindow();
  SyncEngine.start();
});

const cleanText = (val: any) => String(val || '').trim().toUpperCase();
const cleanBarcode = (val: any) => String(val || '').trim().replace(/\D/g, '');

// --- HANDLERS ---
ipcMain.handle('is-cloud-configured', () => !!getSupabase());
ipcMain.handle('get-app-title', async () => (await get('SELECT value FROM settings WHERE key = ?', ['company_name']))?.value || 'SDG CONTROLE');

ipcMain.handle('get-all-products', async () => {
  const supabase = getSupabase();

  // Se houver nuvem, tentamos puxar atualizações em background, mas SEM bloquear o retorno local
  if (supabase) {
    supabase.from('products').select('*').then(async ({ data: products }) => {
      if (products) {
        for (const p of products) {
          const local = await get('SELECT synced FROM products WHERE id = ?', [p.id]);
          if (!local || local.synced === 1) {
            await run('INSERT OR REPLACE INTO products (id, barcode, name, price, image, archived, synced) VALUES (?, ?, ?, ?, ?, ?, 1)', 
              [p.id, p.barcode, p.name, p.price, p.image, p.archived ? 1 : 0]);
          }
        }
      }
    }).catch(() => {});
  }

  const products = await query('SELECT * FROM products ORDER BY archived ASC, name ASC');
  const inventory = await query('SELECT * FROM inventory');

  return products.map(p => {
    const stocks: any = {};
    inventory.filter(i => i.product_id === p.id).forEach(i => stocks[i.store_id] = i.quantity);
    return { ...p, stocks };
  });
});

ipcMain.handle('save-manual-product', async (_, p: any) => {
  try {
    const id = p.id || randomUUID();
    const name = cleanText(p.name);
    const barcode = cleanBarcode(p.barcode);
    const price = Number(p.price) || 0;
    const image = p.image || null;

    if (p.id) {
      await run('UPDATE products SET name = ?, barcode = ?, price = ?, image = ?, synced = 0 WHERE id = ?', [name, barcode, price, image, id]);
    } else {
      await run('INSERT INTO products (id, name, barcode, price, image, synced) VALUES (?, ?, ?, ?, ?, 0)', [id, name, barcode, price, image]);
      const stores = await query('SELECT id FROM stores');
      for (const s of stores) {
        await run('INSERT OR IGNORE INTO inventory (product_id, store_id, quantity) VALUES (?, ?, 0)', [id, s.id]);
      }
    }

    // Forçar uma tentativa de sincronização imediata
    SyncEngine.syncPendingProducts().catch(() => {});

    return { success: true };
  } catch (error: any) {
    logError(`Erro ao salvar produto: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-sale', async (_, sale: any) => {
  const saleId = randomUUID();
  await run(`INSERT INTO sales (id, total, discount, payment_method, vendedor, store_id, items, synced) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`, 
    [saleId, sale.total, sale.discount || 0, sale.payment_method, sale.vendedor, sale.store_id, JSON.stringify(sale.items)]);
  for (const item of sale.items) {
    if (!String(item.id).startsWith('OS-')) await run(`UPDATE inventory SET quantity = quantity - ? WHERE product_id = ? AND store_id = ?`, [item.qtd, item.id, sale.store_id]);
  }
  return { success: true, saleId };
});

ipcMain.handle('get-stores', async (_, inc) => inc ? await query('SELECT * FROM stores ORDER BY archived ASC, name ASC') : await query('SELECT * FROM stores WHERE archived = 0 ORDER BY name ASC'));
ipcMain.handle('save-store', async (_, { id, name }) => {
  if (id) await run('UPDATE stores SET name = ? WHERE id = ?', [name.trim().toUpperCase(), id]);
  else await run('INSERT INTO stores (id, name) VALUES (?, ?)', [randomUUID(), name.trim().toUpperCase()]);
  return { success: true };
});
ipcMain.handle('archive-store', async (_, { id, archived }) => { await run('UPDATE stores SET archived = ? WHERE id = ?', [archived ? 1 : 0, id]); return { success: true }; });

ipcMain.handle('login', async (_, { username, password }) => await get('SELECT id, name, role FROM users WHERE name = ? AND password = ?', [username, password]));
ipcMain.handle('get-users', async () => await query('SELECT id, name, role FROM users ORDER BY name ASC'));
ipcMain.handle('save-user', async (_, u: any) => {
  const id = u.id || randomUUID();
  if (u.id) await run('UPDATE users SET name = ?, password = ?, role = ? WHERE id = ?', [u.name, u.password, u.role, id]);
  else await run('INSERT INTO users (id, name, password, role) VALUES (?, ?, ?, ?)', [id, u.name, u.password, u.role || 'vendedor']);
  return { success: true };
});

ipcMain.handle('get-sync-status', async () => {
  const pS = await get('SELECT count(*) as count FROM sales WHERE synced = 0');
  const pP = await get('SELECT count(*) as count FROM products WHERE synced = 0');
  return { pending: (pS?.count || 0) + (pP?.count || 0), total: (await get('SELECT count(*) as count FROM sales'))?.count || 0 };
});

ipcMain.handle('get-low-stock-items', async () => {
  const inv = await query('SELECT * FROM inventory WHERE quantity <= min_stock LIMIT 20');
  const ids = inv.map(i => i.product_id);
  if (ids.length === 0) return [];
  const prods = await query(`SELECT id, name, barcode FROM products WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
  return prods.map(p => {
    const stocks: any = {};
    inv.filter(i => i.product_id === p.id).forEach(i => stocks[i.store_id] = i.quantity);
    return { ...p, stocks };
  });
});

ipcMain.handle('get-stale-stock-items', async () => {
  const products = await query(`SELECT p.id, p.name, p.barcode FROM products p WHERE p.archived = 0 AND EXISTS (SELECT 1 FROM inventory WHERE product_id = p.id AND quantity > 0) LIMIT 20`);
  return products.map(p => ({ ...p, stocks: {} })); // Simplificado para evitar erro
});

ipcMain.handle('get-commissions', async () => await query('SELECT * FROM commissions ORDER BY created_at DESC'));
ipcMain.handle('get-dashboard-stats', async () => ({
  totalRevenue: (await get('SELECT SUM(total) as total FROM sales'))?.total || 0,
  monthlyRevenue: (await get("SELECT SUM(total) as total FROM sales WHERE strftime('%m', created_at) = strftime('%m', 'now')"))?.total || 0
}));

ipcMain.handle('import-xml-products', async (_, data, storeId) => await GuardianProtocol.bulkInsert(GuardianProtocol.validate(GuardianProtocol.parseXML(data, storeId))));
ipcMain.handle('download-protocol-template', async () => `<?xml version="1.0" encoding="UTF-8"?><products><item><barcode>2024</barcode><name>EXEMPLO</name><price>50.00</price><quantity>100</quantity></item></products>`);
ipcMain.handle('get-settings', async () => await query('SELECT * FROM settings'));
ipcMain.handle('save-settings', async (_, arr) => {
  for (const s of arr) {
    if (await get('SELECT key FROM settings WHERE key = ?', [s.key])) await run('UPDATE settings SET value = ? WHERE key = ?', [s.value, s.key]);
    else await run('INSERT INTO settings (key, value) VALUES (?, ?)', [s.key, s.value]);
  }
  return { success: true };
});

ipcMain.handle('archive-product', async (_, { id, archived }) => { await run('UPDATE products SET archived = ?, synced = 0 WHERE id = ?', [archived ? 1 : 0, id]); return { success: true }; });
ipcMain.handle('update-inventory-quantity', async (_, { productId, storeId, quantity, minStock, saleToleranceDays }) => {
  const qty = Number(quantity) || 0;
  const min = Number(minStock) ?? 2;
  const stale = Number(saleToleranceDays) ?? 30;

  // 1. Salva no Supabase imediatamente se possível
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from('inventory').upsert({
        product_id: productId,
        store_id: storeId,
        quantity: qty,
        min_stock: min,
        sale_tolerance_days: stale
      });
      if (error) logError(`Erro Supabase Inventory: ${error.message}`);
      else logError(`Estoque atualizado na Nuvem: Prod ${productId} Loja ${storeId} Qtd ${qty}`);
    } catch (e) {
      logError(`Erro Fatal Inventory Cloud: ${e}`);
    }
  }

  // 2. Salva no banco local
  await run('INSERT OR REPLACE INTO inventory (product_id, store_id, quantity, min_stock, sale_tolerance_days) VALUES (?, ?, ?, ?, ?)', 
    [productId, storeId, qty, min, stale]);
  
  return { success: true };
});
ipcMain.handle('get-product-by-barcode', async (_, bc, sid) => {
  const p = await get('SELECT * FROM products WHERE barcode = ? AND archived = 0', [cleanBarcode(bc)]);
  if (!p) return null;
  const inv = await query('SELECT * FROM inventory WHERE product_id = ?', [p.id]);
  const stocks: any = {};
  inv.forEach(i => stocks[i.store_id] = i.quantity);
  return { ...p, stocks, stock: stocks[sid] || 0 };
});

ipcMain.handle('upload-product-image', async (_, { barcode, base64Data }) => {
  try {
    const fileName = `${barcode}.png`;
    const filePath = path.join(UPLOAD_PATH, fileName);
    fs.writeFileSync(filePath, Buffer.from(base64Data.split(',')[1], 'base64'));
    return { success: true, fileName };
  } catch (error) { return { success: false }; }
});

ipcMain.on('window-minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
ipcMain.on('window-maximize', (e) => { const w = BrowserWindow.fromWebContents(e.sender); if (w?.isMaximized()) w.unmaximize(); else w?.maximize(); });
ipcMain.on('window-close', (e) => BrowserWindow.fromWebContents(e.sender)?.close());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
