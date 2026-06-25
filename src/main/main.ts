import { app, BrowserWindow, ipcMain, protocol, net, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';
import { initDatabase, get, run, query } from './database';
import { GuardianProtocol } from './GuardianProtocol';
import { SyncEngine } from './SyncEngine';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// Configuração simples do autoUpdater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

const LOG_FILE = path.join(app.getPath('userData'), 'error.log');
const logError = (msg: string) => {
  const time = new Date().toISOString();
  try { fs.appendFileSync(LOG_FILE, `[${time}] ${msg}\n`); } catch (e) {}
  console.error(msg);
};

autoUpdater.on('update-downloaded', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Atualização Disponível',
    message: `Uma nova versão (${info.version}) foi baixada. Deseja reiniciar o sistema para aplicar a atualização agora?`,
    buttons: ['Reiniciar Agora', 'Depois'],
    defaultId: 0
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  logError(`Erro no autoUpdater: ${err.message}`);
});

let supabaseClient: any = null;
const getSupabase = () => {
  if (supabaseClient) return supabaseClient;
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_ANON_KEY || '';
  if (url && url !== 'SUA_URL_DO_SUPABASE_AQUI' && url !== '') {
    supabaseClient = createClient(url, key, {
      realtime: {
        transport: ws
      }
    });
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
    win.webContents.openDevTools();
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

  // Inicia a verificação de atualizações após 3 segundos para não pesar o boot
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 3000);
  }
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
    
    // Automação: Registrar Transação Financeira (Entrada)
    await run(`INSERT INTO financial_transactions (id, type, category, description, amount, payment_method, store_id, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), 'INFLOW', 'VENDA', `VENDA PDV - ${sale.vendedor}`, sale.total, sale.payment_method, sale.store_id, saleId]);

    // Automação: Calcular e Registrar Comissão (2% padrão)
    const commissionValue = sale.total * 0.02;
    await run(`INSERT INTO commissions (id, sale_id, vendedor, value, percentage, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [randomUUID(), saleId, sale.vendedor, commissionValue, 2, 'pending']);

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

    // Se a OS for marcada como paga no ato, registrar no financeiro
    if (repair.payment_status === 'paid' && repair.price > 0) {
      await run(`INSERT INTO financial_transactions (id, type, category, description, amount, payment_method, store_id, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), 'INFLOW', 'MANUTENÇÃO', `OS ${repair.device_model} - ${repair.customer_name}`, repair.price, 'DINHEIRO', repair.entry_store_id, id]);
    }

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
    
    // Se mudar para pago, lançar no financeiro se ainda não houver transação
    if (payment_status === 'paid') {
      const repair = await get('SELECT * FROM maintenance_orders WHERE id = ?', [id]);
      const exists = await get('SELECT 1 FROM financial_transactions WHERE reference_id = ?', [id]);
      if (repair && !exists && repair.price > 0) {
        await run(`INSERT INTO financial_transactions (id, type, category, description, amount, payment_method, store_id, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [randomUUID(), 'INFLOW', 'MANUTENÇÃO', `OS ${repair.device_model} - ${repair.customer_name}`, repair.price, 'DINHEIRO', repair.entry_store_id, id]);
      }
    }
    
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
  
  // Automação: Registrar Transação Financeira (Saída)
  const cat = await get('SELECT name FROM expense_categories WHERE id = ?', [exp.category_id]);
  await run(`INSERT INTO financial_transactions (id, type, category, description, amount, date, payment_method, store_id, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [randomUUID(), 'OUTFLOW', cat?.name || 'OUTROS', exp.description, exp.value, exp.date || new Date().toISOString(), exp.payment_method, exp.store_id, id]);

  return { success: true };
});
ipcMain.handle('delete-expense', async (_, id: string) => { 
  await run('DELETE FROM expenses WHERE id = ?', [id]); 
  await run('DELETE FROM financial_transactions WHERE reference_id = ?', [id]);
  return { success: true }; 
});
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
  try {
    const inflows = await get("SELECT SUM(amount) as total FROM financial_transactions WHERE type = 'INFLOW'");
    const outflows = await get("SELECT SUM(amount) as total FROM financial_transactions WHERE type = 'OUTFLOW'");
    const commissions = await get('SELECT SUM(value) as total FROM commissions');
    
    // Ledger consolidated from financial_transactions
    const ledger = await query(`
      SELECT id, amount as value, date, description, payment_method, 
      (CASE WHEN type = 'INFLOW' THEN 'ENTRADA (' || category || ')' ELSE category END) as type 
      FROM financial_transactions 
      ORDER BY date DESC LIMIT 50
    `);

    // Profit margin calculation (Cost vs Sale)
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

    const trends = await query(`SELECT strftime('%m/%Y', date) as month, SUM(amount) as inflow FROM financial_transactions WHERE type = 'INFLOW' GROUP BY month ORDER BY date DESC LIMIT 6`);

    return {
      totalInflow: inflows?.total || 0,
      totalOutflow: outflows?.total || 0,
      netProfit: (inflows?.total || 0) - (outflows?.total || 0),
      estimatedCost: totalCost,
      trends: trends.reverse(),
      ledger
    };
  } catch (err: any) {
    console.error('Erro no resumo financeiro:', err);
    return { totalInflow: 0, totalOutflow: 0, netProfit: 0, estimatedCost: 0, trends: [], ledger: [] };
  }
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
import { PrinterModule } from './PrinterModule';

// --- IMPRESSÃO ---

ipcMain.handle('get-printers', async () => {
  const win = new BrowserWindow({ show: false });
  const printers = await win.webContents.getPrintersAsync();
  win.close();
  return printers;
});

ipcMain.handle('print-usb', async (_, { vid, pid, content }) => {
  return await PrinterModule.printUSB(vid, pid, content);
});

ipcMain.handle('usb-direct-print', async (_, { buffer }) => {
  try {
    const usb = require('usb');
    const device = usb.findByIds(0x28E9, 0x0289);
    if (!device) return { success: false, error: 'Impressora USB não encontrada' };

    return new Promise((resolve) => {
      try {
        device.open();
        const iface = device.interfaces[0];
        iface.claim();
        const outEndpoint = iface.endpoints.find((e: any) => e.direction === 'out');
        if (!outEndpoint) throw new Error('Endpoint não encontrado');

        outEndpoint.transfer(Buffer.from(buffer), (err: any) => {
          iface.release(true, () => device.close());
          if (err) resolve({ success: false, error: err.message });
          else resolve({ success: true });
        });
      } catch (e: any) {
        try { device.close(); } catch (err) {}
        resolve({ success: false, error: e.message });
      }
    });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('list-usb-devices', async () => {
  try {
    const usb = require('usb');
    const devices = usb.getDeviceList();
    return devices.map((d: any) => {
      try {
        return {
          vendorId: d.deviceDescriptor.idVendor,
          productId: d.deviceDescriptor.idProduct,
          manufacturer: d.deviceDescriptor.iManufacturer,
          product: d.deviceDescriptor.iProduct
        };
      } catch (e) {
        return { vendorId: d.deviceDescriptor.idVendor, productId: d.deviceDescriptor.idProduct };
      }
    });
  } catch (e: any) {
    return { error: e.message };
  }
});

ipcMain.handle('debug-print', async (_, { deviceName }) => {
  logError(`INICIANDO DEBUG-PRINT PARA: ${deviceName}`);
  const win = new BrowserWindow({ show: false });
  const printers = await win.webContents.getPrintersAsync();
  const target = printers.find(p => p.name === deviceName);
  
  if (!target) {
    logError(`ERRO: Impressora '${deviceName}' não encontrada na lista do Windows.`);
    win.close();
    return { success: false, error: 'Impressora não encontrada' };
  }

  try {
    const html = `<html><body><h1 style="font-size: 20px;">DEBUG OK</h1><p>Teste de sistema</p></body></html>`;
    const tmp = path.join(app.getPath('userData'), 'debug_print.html');
    fs.writeFileSync(tmp, html);
    await win.loadFile(tmp);
    await new Promise(r => setTimeout(r, 1000));

    return new Promise((resolve) => {
      win.webContents.print({ 
        silent: true, 
        deviceName: deviceName,
        pageSize: { width: 58000, height: 200000 },
        margins: { marginType: 'none' }
      }, (success, failureReason) => {
        logError(`RESULTADO PRINT: success=${success}, reason=${failureReason}`);
        win.close();
        resolve({ success, error: failureReason });
      });
    });
  } catch (e: any) {
    win.close();
    logError(`ERRO NO CATCH DEBUG: ${e.message}`);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('test-printer', async (_, { deviceName }) => {
  logError(`TESTE DE IMPRESSORA INICIADO: ${deviceName}`);
  
  // Se for endereço USB direto
  if (deviceName && deviceName.toUpperCase().startsWith('USB:')) {
    const parts = deviceName.split(':');
    const vid = parseInt(parts[1], 16);
    const pid = parseInt(parts[2], 16);
    return await PrinterModule.printUSB(vid, pid, "TESTE DE IMPRESSAO DIRETA (MODO PYTHON)");
  }

  // Se for porta COM ou IP
  if (deviceName && (deviceName.toUpperCase().startsWith('COM') || deviceName.includes('.'))) {
    return await PrinterModule.printRaw({
      type: 'SALE',
      storeName: 'TESTE DIRETO',
      items: [{ name: 'TESTE DE CONEXAO', qtd: 1, price: 0 }],
      total: 0,
      id: 'TESTE-RAW',
      date: new Date().toLocaleString()
    }, deviceName);
  }

  // Caso seja um nome de impressora do Windows (ex: POS58 Printer) e o tipo for escpos
  // Vamos tentar enviar um comando bruto via PrinterModule
  const res = await PrinterModule.printRaw({
    type: 'SALE',
    storeName: 'TESTE WINDOWS RAW',
    items: [{ name: 'TESTE DE FILA', qtd: 1, price: 0 }],
    total: 0,
    id: 'TESTE-WIN',
    date: new Date().toLocaleString()
  }, `printer:${deviceName}`);

  if (res.success) return res;

  // Se o modo RAW falhar ou se não for um endereço direto, usamos o Metodo HTML (Fallback)
  let win: BrowserWindow | null = null;
  try {
    const html = `
      <html>
        <style>
          body { font-family: monospace; width: 58mm; padding: 10px; font-size: 12px; text-align: center; }
          .bold { font-weight: bold; font-size: 14px; }
          .line { border-top: 1px dashed #000; margin: 5px 0; }
        </style>
        <body>
          <div class="bold">TESTE DE IMPRESSAO</div>
          <div>SDG CONTROLE - MODO HTML</div>
          <div class="line"></div>
          <div>IMPRESSORA: ${deviceName || 'PADRAO'}</div>
          <div>DATA: ${new Date().toLocaleString()}</div>
          <div class="line"></div>
          <p>Se voce esta lendo isto, a sua impressora esta funcionando via Driver do Windows!</p>
          <div class="line"></div>
          <br/><br/>.
        </body>
      </html>
    `;
    const tmp = path.join(app.getPath('userData'), 'test_print.html');
    fs.writeFileSync(tmp, html);
    win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
    await win.loadFile(tmp);
    await new Promise(r => setTimeout(r, 500));
    
    return new Promise((resolve) => {
      if (!win) return resolve({ success: false, error: 'Falha ao criar janela' });
      const printOptions: any = { 
        silent: !!deviceName,
        pageSize: { width: 58000, height: 297000 },
        margins: { marginType: 'none' }
      };
      if (deviceName && deviceName.trim() !== '') {
        printOptions.deviceName = deviceName.trim();
      }

      win.webContents.print(printOptions, (success, failureReason) => {
        if (win && !win.isDestroyed()) win.close();
        resolve({ success, error: failureReason });
      });
    });
  } catch (e: any) {
    if (win && !win.isDestroyed()) win.close();
    return { success: false, error: e.message };
  }
});

ipcMain.handle('print-raw', async (_, { data, interfaceName }) => {
  return await PrinterModule.printRaw(data, interfaceName);
});

ipcMain.handle('print-silent', async (_, { html, deviceName }) => {
  let win: BrowserWindow | null = null;
  try {
    const tmp = path.join(app.getPath('userData'), 'print_silent.html');
    fs.writeFileSync(tmp, html);
    win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
    await win.loadFile(tmp);
    await new Promise(r => setTimeout(r, 500));
    
    return new Promise((resolve) => {
      if (!win) return resolve({ success: false, error: 'Falha ao criar janela' });
      
      const printOptions: any = {
        silent: true,
        pageSize: { width: 58000, height: 297000 },
        margins: { marginType: 'none' },
      };
      if (deviceName && deviceName.trim() !== '') {
        printOptions.deviceName = deviceName.trim();
      }

      win.webContents.print(printOptions, (success, failureReason) => {
        if (win && !win.isDestroyed()) win.close();
        resolve({ success, error: failureReason });
      });
    });
  } catch (e: any) {
    if (win && !win.isDestroyed()) win.close();
    return { success: false, error: e.message };
  }
});

ipcMain.handle('print-repair-receipt', async (_, { repair, storeName, logo, deviceName }) => {
  let win: BrowserWindow | null = null;
  try {
    const html = generateRepairReceiptHTML(repair, storeName, logo);
    const tmp = path.join(app.getPath('userData'), 'print_os.html');
    fs.writeFileSync(tmp, html);
    win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
    await win.loadFile(tmp);
    await new Promise(r => setTimeout(r, 500));
    
    return new Promise((resolve) => {
      if (!win) return resolve({ success: false, error: 'Falha ao criar janela' });
      const printOptions: any = {
        silent: !!deviceName,
        pageSize: { width: 58000, height: 297000 },
        margins: { marginType: 'none' },
      };
      if (deviceName && deviceName.trim() !== '') printOptions.deviceName = deviceName.trim();

      win.webContents.print(printOptions, (success, failureReason) => {
        if (win && !win.isDestroyed()) win.close();
        resolve({ success, error: failureReason });
      });
    });
  } catch (e: any) { 
    if (win && !win.isDestroyed()) win.close();
    return { success: false, error: e.message }; 
  }
});

ipcMain.handle('print-receipt', async (_, { sale, storeName, logo, deviceName }) => {
  let win: BrowserWindow | null = null;
  try {
    const html = generateReceiptHTML(sale, storeName, logo);
    const tmp = path.join(app.getPath('userData'), 'print_sale.html');
    fs.writeFileSync(tmp, html);
    win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
    await win.loadFile(tmp);
    await new Promise(r => setTimeout(r, 500));

    return new Promise((resolve) => {
      if (!win) return resolve({ success: false, error: 'Falha ao criar janela' });
      const printOptions: any = {
        silent: !!deviceName,
        pageSize: { width: 58000, height: 297000 },
        margins: { marginType: 'none' },
      };
      if (deviceName && deviceName.trim() !== '') printOptions.deviceName = deviceName.trim();

      win.webContents.print(printOptions, (success, failureReason) => {
        if (win && !win.isDestroyed()) win.close();
        resolve({ success, error: failureReason });
      });
    });
  } catch (e: any) { 
    if (win && !win.isDestroyed()) win.close();
    return { success: false, error: e.message }; 
  }
});

ipcMain.on('window-minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
ipcMain.on('window-maximize', (e) => { const w = BrowserWindow.fromWebContents(e.sender); if (w?.isMaximized()) w.unmaximize(); else w?.maximize(); });
ipcMain.on('window-close', (e) => BrowserWindow.fromWebContents(e.sender)?.close());

ipcMain.handle('check-for-updates', async () => {
  if (app.isPackaged) {
    const result = await autoUpdater.checkForUpdatesAndNotify();
    return { success: true, result };
  }
  return { success: false, error: 'App não empacotado' };
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
