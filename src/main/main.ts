import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { initDatabase, get, run, query } from './database';
import { GuardianProtocol } from './GuardianProtocol';
import { SyncEngine } from './SyncEngine';
import { randomUUID } from 'node:crypto';
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const isDev = !app.isPackaged;
  const devUrl = 'http://127.0.0.1:5173';

  if (isDev) {
    // Tenta carregar a URL. Se falhar (Vite ainda subindo), tenta novamente em 1s
    const loadDevUrl = () => {
      win.loadURL(devUrl).catch(() => {
        console.log('[SISTEMA] Aguardando Vite...');
        setTimeout(loadDevUrl, 1000);
      });
    };
    loadDevUrl();
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../index.html'));
  }
}

app.whenReady().then(async () => {
  try {
    console.log('[SISTEMA] Iniciando ambiente...', process.env.NODE_ENV || 'development');
    await initDatabase();
    createWindow();
    SyncEngine.start();
    console.log('[SISTEMA] Banco de Dados e Motores iniciados com sucesso.');
  } catch (e) {
    console.error('[ERRO CRÍTICO NA INICIALIZAÇÃO]', e);
  }
});

// PROTOCOLO DE PUREZA (TRATAMENTO DE TEXTO)
const cleanText = (val: any) => String(val || '').trim().toUpperCase();
const cleanBarcode = (val: any) => String(val || '').trim().replace(/\D/g, ''); // Apenas números no código

ipcMain.handle('save-manual-product', async (_, p: any) => {
  try {
    const name = cleanText(p.name);
    const barcode = cleanBarcode(p.barcode);
    const price = Number(p.price) || 0;

    if (!name || !barcode) return { success: false, error: 'DADOS INCOMPLETOS!' };

    if (p.id) {
      await run('UPDATE products SET name = ?, barcode = ?, price = ? WHERE id = ?', [name, barcode, price, p.id]);
    } else {
      const existing = await get('SELECT id FROM products WHERE barcode = ?', [barcode]);
      if (existing) return { success: false, error: 'ESSE CÓDIGO JÁ EXISTE NO SISTEMA!' };

      const newId = randomUUID();
      await run('INSERT INTO products (id, name, barcode, price) VALUES (?, ?, ?, ?)', [newId, name, barcode, price]);
      await run('INSERT OR IGNORE INTO inventory (product_id, store_id, quantity) VALUES (?, "1", 0), (?, "2", 0), (?, "3", 0)', [newId, newId, newId]);
    }
    return { success: true };
  } catch (error: any) {
    console.error('[ERRO SALVAR]', error);
    return { success: false, error: 'ERRO INTERNO NO BANCO' };
  }
});

ipcMain.handle('get-all-products', async () => {
  return await query(`
    SELECT p.*, 
    COALESCE((SELECT quantity FROM inventory WHERE product_id = p.id AND store_id = '1'), 0) as stock_1,
    COALESCE((SELECT quantity FROM inventory WHERE product_id = p.id AND store_id = '2'), 0) as stock_2,
    COALESCE((SELECT quantity FROM inventory WHERE product_id = p.id AND store_id = '3'), 0) as stock_3
    FROM products p ORDER BY p.name ASC
  `);
});

ipcMain.handle('get-sync-status', async () => {
  const pending = await get('SELECT count(*) as count FROM sales WHERE synced = 0');
  const total = await get('SELECT count(*) as count FROM sales');
  return { pending: pending?.count || 0, total: total?.count || 0 };
});

ipcMain.handle('get-product-by-barcode', async (_, barcode: string, storeId: string) => {
  const product = await get('SELECT * FROM products WHERE barcode = ?', [cleanBarcode(barcode)]);
  if (product && storeId) {
    const stock = await get('SELECT quantity FROM inventory WHERE product_id = ? AND store_id = ?', [product.id, storeId]);
    product.stock = stock ? stock.quantity : 0;
  }
  return product;
});

ipcMain.handle('import-xml-products', async (_, xmlData: string, storeId: string) => {
  try {
    const products = GuardianProtocol.parseXML(xmlData, storeId);
    return await GuardianProtocol.bulkInsert(GuardianProtocol.validate(products));
  } catch (e) { return { newProducts: 0, stockUpdates: 0 }; }
});

ipcMain.handle('download-protocol-template', async () => {
  return `<?xml version="1.0" encoding="UTF-8"?><products><item><barcode>2024</barcode><name>EXEMPLO PRODUTO</name><price>50.00</price><quantity>100</quantity></item></products>`;
});

ipcMain.handle('save-user', async (_, u: any) => {
  try {
    if (u.id) {
      await run('UPDATE users SET name = ?, password = ?, role = ? WHERE id = ?', [u.name, u.password, u.role, u.id]);
    } else {
      await run('INSERT INTO users (id, name, password, role) VALUES (?, ?, ?, ?)', [randomUUID(), u.name, u.password, u.role || 'vendedor']);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: 'ERRO AO SALVAR USUÁRIO' };
  }
});

ipcMain.handle('get-commissions', async () => {
  return await query('SELECT * FROM commissions ORDER BY created_at DESC');
});

ipcMain.handle('get-dashboard-stats', async () => {
  const totalSales = await get('SELECT SUM(total) as total FROM sales');
  const monthSales = await get("SELECT SUM(total) as total FROM sales WHERE strftime('%m', created_at) = strftime('%m', 'now')");
  
  return {
    totalRevenue: totalSales?.total || 0,
    monthlyRevenue: monthSales?.total || 0
  };
});

ipcMain.handle('get-settings', async () => {
  return await query('SELECT * FROM settings');
});

ipcMain.handle('save-settings', async (_, settingsArray: {key: string, value: string}[]) => {
  for (const s of settingsArray) {
    const existing = await get('SELECT key FROM settings WHERE key = ?', [s.key]);
    if (existing) {
      await run('UPDATE settings SET value = ? WHERE key = ?', [s.value, s.key]);
    } else {
      await run('INSERT INTO settings (key, value) VALUES (?, ?)', [s.key, s.value]);
    }
  }
  return { success: true };
});

ipcMain.handle('get-stores', async () => {
  return await query('SELECT * FROM stores ORDER BY name ASC');
});

ipcMain.handle('get-users', async () => {
  return await query('SELECT id, name, role FROM users ORDER BY name ASC');
});

ipcMain.handle('login', async (_, { username, password }) => {
  const user = await get('SELECT id, name, role FROM users WHERE name = ? AND password = ?', [username, password]);
  return user || null;
});

ipcMain.handle('save-sale', async (_, sale: any) => {
  const saleId = randomUUID();
  
  // Registrar Venda
  await run(`INSERT INTO sales (id, total, discount, payment_method, vendedor, store_id, items) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
    [saleId, sale.total, sale.discount || 0, sale.payment_method, sale.vendedor, sale.store_id, JSON.stringify(sale.items)]);

  // Baixa de Estoque
  for (const item of sale.items) {
    if (String(item.id).startsWith('OS-')) continue; // Ignorar serviços/manutenção na baixa de estoque de produtos
    await run(`UPDATE inventory SET quantity = quantity - ? WHERE product_id = ? AND store_id = ?`, [item.qtd, item.id, sale.store_id]);
  }

  // Calcular Comissão (Ex: 10% fixo para simplificar, conforme item 6 do plano)
  const commissionPercentage = 0.10;
  const commissionValue = sale.total * commissionPercentage;
  const commissionId = randomUUID();
  
  await run(`INSERT INTO commissions (id, sale_id, vendedor, value, percentage) VALUES (?, ?, ?, ?, ?)`,
    [commissionId, saleId, sale.vendedor, commissionValue, commissionPercentage * 100]);

  return { success: true, saleId };
});

ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.minimize();
});

ipcMain.on('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.close();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });