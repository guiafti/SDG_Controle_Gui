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
    let filePath = path.join(app.getPath('userData'), 'product_images', fileName);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(app.getPath('userData'), 'repair_images', fileName);
    }
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
    SyncEngine.syncPendingProducts().catch(() => {});
    return { success: true };
  } catch (error: any) {
    logError(`Erro ao salvar produto: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-sale', async (_, sale: any) => {
  try {
    const saleId = randomUUID();
    await run(`INSERT INTO sales (id, total, discount, payment_method, vendedor, store_id, customer_id, items, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`, 
      [saleId, sale.total, sale.discount || 0, sale.payment_method, sale.vendedor, sale.store_id, sale.customer_id || null, JSON.stringify(sale.items)]);
    for (const item of sale.items) {
      if (!String(item.id).startsWith('OS-')) await run(`UPDATE inventory SET quantity = quantity - ? WHERE product_id = ? AND store_id = ?`, [item.qtd, item.id, sale.store_id]);
    }
    return { success: true, saleId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-customers', async () => await query('SELECT * FROM customers ORDER BY name ASC'));
ipcMain.handle('get-sales-by-customer', async (_, customerId: string) => await query('SELECT * FROM sales WHERE customer_id = ? ORDER BY created_at DESC', [customerId]));
ipcMain.handle('save-customer', async (_, c: any) => {
  try {
    const id = c.id || randomUUID();
    await run(`INSERT OR REPLACE INTO customers (id, name, phone, email, address, cpf, rg, birth_date, city, origin, notes, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [id, cleanText(c.name), c.phone || '', c.email || '', c.address || '', c.cpf || '', c.rg || '', c.birth_date || '', cleanText(c.city || 'ALMENARA'), cleanText(c.origin || ''), c.notes || '']);
    SyncEngine.syncPendingCustomers().catch(() => {});
    return { success: true, id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-tasks', async () => {
  const tasks = await query('SELECT * FROM tasks ORDER BY created_at DESC');
  const today = new Date().toISOString().split('T')[0];
  
  // Logic to 'reset' routine tasks locally for the day
  return tasks.map(t => {
    if (t.is_routine && t.completed_at && !t.completed_at.startsWith(today)) {
      return { ...t, status: 'pending', photo_proof: null, justification: null, completed_at: null };
    }
    return t;
  });
});

ipcMain.handle('save-task', async (_, t: any) => {
  try {
    const id = t.id || randomUUID();
    await run(`INSERT OR REPLACE INTO tasks (id, title, assignee_type, assignee_id, due_date, status, is_routine, proof_required, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [id, cleanText(t.title), t.assignee_type, t.assignee_id, t.due_date || '', t.status || 'pending', t.is_routine ? 1 : 0, t.proof_required ? 1 : 0]);
    SyncEngine.syncPendingTasks().catch(() => {});
    return { success: true, id };
  } catch (err: any) { return { success: false, error: err.message }; }
});

ipcMain.handle('complete-task', async (_, { id, photo, justification }) => {
  try {
    const now = new Date().toISOString();
    await run('UPDATE tasks SET status = ?, photo_proof = ?, justification = ?, completed_at = ? WHERE id = ?', 
      ['completed', photo || null, justification || null, now, id]);
    return { success: true };
  } catch (err: any) { return { success: false, error: err.message }; }
});

ipcMain.handle('toggle-task', async (_, { id, status }) => {
  try {
    const now = status === 'completed' ? new Date().toISOString() : null;
    await run('UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?', [status, now, id]);
    return { success: true };
  } catch (err: any) { return { success: false, error: err.message }; }
});

ipcMain.handle('delete-task', async (_, id: string) => {
  try {
    await run('DELETE FROM tasks WHERE id = ?', [id]);
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('tasks').delete().eq('id', id);
    }
    return { success: true };
  } catch (err: any) { return { success: false, error: err.message }; }
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
  const pR = await get('SELECT count(*) as count FROM maintenance_orders WHERE synced = 0');
  return { 
    pending: (pS?.count || 0) + (pP?.count || 0) + (pR?.count || 0), 
    total: (await get('SELECT count(*) as count FROM sales'))?.count || 0 
  };
});

ipcMain.handle('get-repairs', async () => await query('SELECT * FROM maintenance_orders ORDER BY created_at DESC'));

ipcMain.handle('save-repair', async (_, repair: any) => {
  try {
    const id = repair.id || randomUUID();
    await run(`
      INSERT OR REPLACE INTO maintenance_orders 
      (id, customer_name, customer_phone, device_brand, device_model, serial_number, issue_description, technical_notes, checklist, priority, photo_url, price, entry_store_id, maintenance_store_id, return_store_id, current_store_id, status, payment_status, delivery_date, synced, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`, 
      [
        id, repair.customer_name, repair.customer_phone, repair.device_brand, repair.device_model, 
        repair.serial_number || '', repair.issue_description, repair.technical_notes || '', 
        repair.checklist || '', repair.priority || 'normal', repair.photo_url, repair.price || 0, 
        repair.entry_store_id, repair.maintenance_store_id, repair.return_store_id, 
        repair.current_store_id || repair.entry_store_id, repair.status || 'Na Loja (Aguardando Envio)', 
        repair.payment_status || 'pending', repair.delivery_date || ''
      ]);
    SyncEngine.syncPendingRepairs().catch(() => {});
    return { success: true, id };
  } catch (err: any) {
    logError(`Erro ao salvar OS: ${err.message}`);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('update-repair-status', async (_, { id, status, current_store_id }) => {
  try {
    await run('UPDATE maintenance_orders SET status = ?, current_store_id = ?, synced = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, current_store_id, id]);
    SyncEngine.syncPendingRepairs().catch(() => {});
    return { success: true };
  } catch (err: any) { return { success: false, error: err.message }; }
});

ipcMain.handle('update-repair-notes', async (_, { id, technical_notes }) => {
  try {
    await run('UPDATE maintenance_orders SET technical_notes = ?, synced = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [technical_notes, id]);
    SyncEngine.syncPendingRepairs().catch(() => {});
    return { success: true };
  } catch (err: any) { return { success: false, error: err.message }; }
});

ipcMain.handle('update-repair-payment', async (_, { id, payment_status }) => {
  try {
    await run('UPDATE maintenance_orders SET payment_status = ?, synced = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [payment_status, id]);
    SyncEngine.syncPendingRepairs().catch(() => {});
    return { success: true };
  } catch (err: any) { return { success: false, error: err.message }; }
});

ipcMain.handle('upload-repair-image', async (_, { id, base64Data }) => {
  try {
    const fileName = `${id}.png`;
    const repairPath = path.join(app.getPath('userData'), 'repair_images');
    if (!fs.existsSync(repairPath)) fs.mkdirSync(repairPath, { recursive: true });
    const filePath = path.join(repairPath, fileName);
    fs.writeFileSync(filePath, Buffer.from(base64Data.split(',')[1], 'base64'));
    return { success: true, fileName };
  } catch (error) { return { success: false }; }
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
  return products.map(p => ({ ...p, stocks: {} }));
});

ipcMain.handle('get-commissions', async () => await query('SELECT * FROM commissions ORDER BY created_at DESC'));

ipcMain.handle('get-expenses', async () => await query('SELECT e.*, c.name as category_name FROM expenses e LEFT JOIN expense_categories c ON e.category_id = c.id ORDER BY e.date DESC'));
ipcMain.handle('save-expense', async (_, exp: any) => {
  const id = exp.id || randomUUID();
  await run(`INSERT OR REPLACE INTO expenses (id, description, category_id, value, date, payment_method, store_id, synced) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [id, exp.description, exp.category_id, exp.value, exp.date || new Date().toISOString(), exp.payment_method, exp.store_id]);
  return { success: true };
});
ipcMain.handle('delete-expense', async (_, id: string) => { await run('DELETE FROM expenses WHERE id = ?', [id]); return { success: true }; });
ipcMain.handle('get-expense-categories', async () => await query('SELECT * FROM expense_categories ORDER BY name ASC'));
ipcMain.handle('save-expense-category', async (_, cat: any) => {
  const id = cat.id || randomUUID();
  await run('INSERT OR REPLACE INTO expense_categories (id, name) VALUES (?, ?)', [id, cat.name.toUpperCase()]);
  return { success: true };
});

ipcMain.handle('get-budgets', async () => await query('SELECT b.*, c.name as category_name FROM budgets b LEFT JOIN expense_categories c ON b.category_id = c.id'));
ipcMain.handle('save-budget', async (_, b: any) => {
  const id = b.id || randomUUID();
  await run('INSERT OR REPLACE INTO budgets (id, category_id, amount, period) VALUES (?, ?, ?, ?)', [id, b.category_id, b.amount, b.period]);
  return { success: true };
});

ipcMain.handle('get-financial-summary', async () => {
  const sales = await get('SELECT SUM(total) as total FROM sales');
  const expenses = await get('SELECT SUM(value) as total FROM expenses');
  const commissions = await get('SELECT SUM(value) as total FROM commissions');
  const saleRecords = await query('SELECT items FROM sales');
  let totalCost = 0;
  for (const s of saleRecords) {
    try {
        const items = JSON.parse(s.items);
        for (const item of items) {
            const p = await get('SELECT cost_price FROM products WHERE id = ?', [item.id]);
            totalCost += (p?.cost_price || (item.preco * 0.6)) * item.qtd;
        }
    } catch(e) {}
  }
  const trends = await query(`SELECT strftime('%m/%Y', created_at) as month, SUM(total) as inflow FROM sales GROUP BY month ORDER BY created_at DESC LIMIT 6`);
  return {
    totalInflow: sales?.total || 0,
    totalOutflow: (expenses?.total || 0) + (commissions?.total || 0),
    netProfit: (sales?.total || 0) - (expenses?.total || 0) - (commissions?.total || 0),
    estimatedCost: totalCost,
    trends: trends.reverse()
  };
});

ipcMain.handle('get-dashboard-stats', async () => ({
  totalRevenue: (await get('SELECT SUM(total) as total FROM sales'))?.total || 0,
  monthlyRevenue: (await get("SELECT SUM(total) as total FROM sales WHERE strftime('%m', created_at) = strftime('%m', 'now')"))?.total || 0
}));

ipcMain.handle('import-xml-products', async (_, data, storeId) => await GuardianProtocol.bulkInsert(GuardianProtocol.validate(GuardianProtocol.parseXML(data, storeId))));
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
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('inventory').upsert({ product_id: productId, store_id: storeId, quantity: qty, min_stock: min, sale_tolerance_days: stale });
    } catch (e) {}
  }
  await run('INSERT OR REPLACE INTO inventory (product_id, store_id, quantity, min_stock, sale_tolerance_days) VALUES (?, ?, ?, ?, ?)', [productId, storeId, qty, min, stale]);
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

import { generateRepairReceiptHTML, generateReceiptHTML } from './ReceiptTemplate';

// --- IMPRESSÃO ---

ipcMain.handle('print-repair-receipt', async (_, { repair, storeName, logo }) => {
  try {
    const html = generateRepairReceiptHTML(repair, storeName, logo);
    const tmp = path.join(app.getPath('userData'), 'print_os.html');
    fs.writeFileSync(tmp, html);
    const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
    await win.loadFile(tmp);
    setTimeout(() => { if (!win.isDestroyed()) win.close(); }, 5000);
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
});

ipcMain.handle('print-receipt', async (_, { sale, storeName, logo }) => {
  try {
    const html = generateReceiptHTML(sale, storeName, logo);
    const tmp = path.join(app.getPath('userData'), 'print_sale.html');
    fs.writeFileSync(tmp, html);
    const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
    await win.loadFile(tmp);
    setTimeout(() => { if (!win.isDestroyed()) win.close(); }, 5000);
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
});

ipcMain.on('window-minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
ipcMain.on('window-maximize', (e) => { const w = BrowserWindow.fromWebContents(e.sender); if (w?.isMaximized()) w.unmaximize(); else w?.maximize(); });
ipcMain.on('window-close', (e) => BrowserWindow.fromWebContents(e.sender)?.close());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
