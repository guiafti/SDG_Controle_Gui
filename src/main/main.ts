import { app, BrowserWindow, ipcMain, protocol, net, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';
import { initDatabase, get, run, query } from './database';
import { GuardianProtocol } from './GuardianProtocol';
import { SyncEngine } from './SyncEngine';
import { randomUUID } from 'node:crypto';

// LOG DE ERROS EM ARQUIVO PARA PRODUÇÃO
const LOG_FILE = path.join(app.getPath('userData'), 'error.log');
const logError = (msg: string) => {
  const time = new Date().toISOString();
  const content = `[${time}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, content);
  console.error(msg);
};

process.on('uncaughtException', (error) => {
  logError(`FALHA CRÍTICA (Uncaught): ${error.message}\nStack: ${error.stack}`);
  dialog.showErrorBox('Erro Crítico', `Ocorreu um erro inesperado: ${error.message}`);
  app.quit();
});

// Registrar privilégios do protocolo ANTES do app ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-img', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

let UPLOAD_PATH = '';

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
    const loadDevUrl = () => {
      win.loadURL(devUrl).catch(() => {
        console.log('[SISTEMA] Aguardando Vite...');
        setTimeout(loadDevUrl, 1000);
      });
    };
    loadDevUrl();
    win.webContents.openDevTools();
  } else {
    // Caminho robusto para o index.html em produção
    const indexPath = path.join(__dirname, '..', 'index.html');
    if (!fs.existsSync(indexPath)) {
      logError(`ERRO: index.html não encontrado em ${indexPath}`);
    }
    win.loadFile(indexPath).catch(err => {
      logError(`ERRO ao carregar win.loadFile: ${err.message}`);
      dialog.showErrorBox('Erro ao carregar UI', `Não foi possível encontrar o arquivo index.html em: ${indexPath}`);
    });
  }
}

app.whenReady().then(async () => {
  try {
    logError('[SISTEMA] Iniciando app...');
    
    UPLOAD_PATH = path.join(app.getPath('userData'), 'product_images');
    if (!fs.existsSync(UPLOAD_PATH)) fs.mkdirSync(UPLOAD_PATH, { recursive: true });

    protocol.handle('local-img', (request) => {
      try {
        const urlPath = request.url.replace('local-img://', '');
        const fileName = path.basename(decodeURIComponent(urlPath));
        const filePath = path.join(UPLOAD_PATH, fileName);
        
        if (!fs.existsSync(filePath)) {
          return new Response('Not Found', { status: 404 });
        }
        
        return net.fetch(pathToFileURL(filePath).toString());
      } catch (e) {
        return new Response('Error', { status: 500 });
      }
    });

    // Inicializa o banco e captura erros específicos
    await initDatabase().catch(err => {
      logError(`ERRO NO BANCO: ${err.message}`);
      dialog.showErrorBox('Erro no Banco de Dados', `Falha ao iniciar o banco local: ${err.message}`);
    });

    createWindow();
    SyncEngine.start();
  } catch (e: any) {
    logError(`ERRO NO STARTUP: ${e.message}`);
    dialog.showErrorBox('Erro Crítico', `O sistema falhou ao iniciar: ${e.message}`);
    app.quit();
  }
});

// Handlers IPC (Mantidos originais)
// ... (resto do código do main.ts omitido para brevidade no exemplo, mas mantido no arquivo real)

// PROTOCOLO DE PUREZA (TRATAMENTO DE TEXTO)
const cleanText = (val: any) => String(val || '').trim().toUpperCase();
const cleanBarcode = (val: any) => String(val || '').trim().replace(/\D/g, '');

ipcMain.handle('upload-product-image', async (_, { barcode, base64Data }) => {
  try {
    const fileName = `${barcode}.png`;
    const filePath = path.join(UPLOAD_PATH, fileName);
    const buffer = Buffer.from(base64Data.split(',')[1], 'base64');
    fs.writeFileSync(filePath, buffer);
    return { success: true, fileName };
  } catch (error) {
    return { success: false };
  }
});

ipcMain.handle('save-manual-product', async (_, p: any) => {
  try {
    const name = cleanText(p.name);
    const barcode = cleanBarcode(p.barcode);
    const price = Number(p.price) || 0;
    const image = p.image || null;
    if (!name || !barcode) return { success: false, error: 'DADOS INCOMPLETOS!' };
    if (p.id) {
      await run('UPDATE products SET name = ?, barcode = ?, price = ?, image = ?, synced = 0 WHERE id = ?', [name, barcode, price, image, p.id]);
    } else {
      const existing = await get('SELECT id FROM products WHERE barcode = ?', [barcode]);
      if (existing) return { success: false, error: 'ESSE CÓDIGO JÁ EXISTE NO SISTEMA!' };
      const newId = randomUUID();
      await run('INSERT INTO products (id, name, barcode, price, image) VALUES (?, ?, ?, ?, ?)', [newId, name, barcode, price, image]);
      const stores = await query('SELECT id FROM stores WHERE archived = 0');
      for (const s of stores) {
        await run('INSERT OR IGNORE INTO inventory (product_id, store_id, quantity) VALUES (?, ?, 0)', [newId, s.id]);
      }
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'ERRO INTERNO NO BANCO' };
  }
});

ipcMain.handle('archive-product', async (_, { id, archived }) => {
  try {
    await run('UPDATE products SET archived = ?, synced = 0 WHERE id = ?', [archived ? 1 : 0, id]);
    return { success: true };
  } catch (error) {
    return { success: false, error: 'ERRO AO ARQUIVAR' };
  }
});

ipcMain.handle('update-inventory-quantity', async (_, { productId, storeId, quantity, minStock, saleToleranceDays }) => {
  try {
    if (minStock !== undefined || saleToleranceDays !== undefined) {
      await run('INSERT OR REPLACE INTO inventory (product_id, store_id, quantity, min_stock, sale_tolerance_days) VALUES (?, ?, ?, ?, ?)', 
        [productId, storeId, quantity, minStock ?? 2, saleToleranceDays ?? 30]);
    } else {
      await run('UPDATE inventory SET quantity = ? WHERE product_id = ? AND store_id = ?', [quantity, productId, storeId]);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: 'ERRO AO ATUALIZAR ESTOQUE' };
  }
});

ipcMain.handle('get-all-products', async () => {
  try {
    const products = await query('SELECT * FROM products ORDER BY archived ASC, name ASC');
    const inventory = await query('SELECT * FROM inventory');
    return products.map(p => {
      const pInv = inventory.filter(i => i.product_id === p.id);
      const stocks: Record<string, number> = {};
      const minStocks: Record<string, number> = {};
      const staleDays: Record<string, number> = {};
      pInv.forEach(i => {
        stocks[i.store_id] = i.quantity;
        minStocks[i.store_id] = i.min_stock ?? 2;
        staleDays[i.store_id] = i.sale_tolerance_days ?? 30;
      });
      return { ...p, stocks, minStocks, staleDays };
    });
  } catch (e) {
    return [];
  }
});

ipcMain.handle('get-low-stock-items', async () => {
  try {
    const inventory = await query('SELECT * FROM inventory WHERE quantity <= min_stock');
    const productIds = [...new Set(inventory.map(i => i.product_id))];
    if (productIds.length === 0) return [];
    const placeholders = productIds.map(() => '?').join(',');
    const products = await query(`SELECT id, name, barcode FROM products WHERE id IN (${placeholders}) AND archived = 0`, productIds);
    return products.map(p => {
      const pInv = inventory.filter(i => i.product_id === p.id);
      const stocks: Record<string, number> = {};
      const minStocks: Record<string, number> = {};
      pInv.forEach(i => {
        stocks[i.store_id] = i.quantity;
        minStocks[i.store_id] = i.min_stock ?? 2;
      });
      return { ...p, stocks, minStocks };
    }).slice(0, 20);
  } catch (e) {
    return [];
  }
});

ipcMain.handle('get-stale-stock-items', async () => {
  try {
    const products = await query(`SELECT p.id, p.name, p.barcode FROM products p WHERE p.archived = 0 AND EXISTS (SELECT 1 FROM inventory WHERE product_id = p.id AND quantity > 0) LIMIT 100`);
    const inventory = await query('SELECT * FROM inventory WHERE quantity > 0');
    const results = [];
    for (const p of products) {
      const pInv = inventory.filter(i => i.product_id === p.id);
      let isStale = false;
      const stocks: Record<string, number> = {};
      const staleDays: Record<string, number> = {};
      for (const i of pInv) {
        stocks[i.store_id] = i.quantity;
        staleDays[i.store_id] = i.sale_tolerance_days ?? 30;
        const lastSale = await get(`SELECT created_at FROM sales, json_each(sales.items) WHERE json_each.value->>'$.id' = ? AND store_id = ? ORDER BY created_at DESC LIMIT 1`, [p.id, i.store_id]);
        const daysSinceSale = lastSale ? (Date.now() - new Date(lastSale.created_at).getTime()) / (1000 * 60 * 60 * 24) : Infinity;
        if (daysSinceSale > (i.sale_tolerance_days ?? 30)) isStale = true;
      }
      if (isStale) results.push({ ...p, stocks, staleDays });
      if (results.length >= 20) break;
    }
    return results;
  } catch (e) {
    return [];
  }
});

ipcMain.handle('get-sync-status', async () => {
  const pending = await get('SELECT count(*) as count FROM sales WHERE synced = 0');
  const total = await get('SELECT count(*) as count FROM sales');
  return { pending: pending?.count || 0, total: total?.count || 0 };
});

ipcMain.handle('get-product-by-barcode', async (_, barcode: string, storeId: string) => {
  try {
    const product = await get('SELECT * FROM products WHERE barcode = ? AND archived = 0', [cleanBarcode(barcode)]);
    if (!product) return null;
    const inventory = await query('SELECT * FROM inventory WHERE product_id = ?', [product.id]);
    const stocks: Record<string, number> = {};
    const minStocks: Record<string, number> = {};
    inventory.forEach(i => {
      stocks[i.store_id] = i.quantity;
      minStocks[i.store_id] = i.min_stock ?? 2;
    });
    return { ...product, stocks, minStocks, stock: stocks[storeId] || 0, min_stock: minStocks[storeId] || 2 };
  } catch (e) {
    return null;
  }
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
  return { totalRevenue: totalSales?.total || 0, monthlyRevenue: monthSales?.total || 0 };
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

ipcMain.handle('get-stores', async (_, includeArchived = false) => {
  if (includeArchived) return await query('SELECT * FROM stores ORDER BY archived ASC, name ASC');
  return await query('SELECT * FROM stores WHERE archived = 0 ORDER BY name ASC');
});

ipcMain.handle('save-store', async (_, { id, name }) => {
  try {
    if (id) {
      await run('UPDATE stores SET name = ? WHERE id = ?', [name.trim().toUpperCase(), id]);
    } else {
      await run('INSERT INTO stores (id, name) VALUES (?, ?)', [randomUUID(), name.trim().toUpperCase()]);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: 'ERRO AO SALVAR LOJA' };
  }
});

ipcMain.handle('archive-store', async (_, { id, archived }) => {
  try {
    await run('UPDATE stores SET archived = ? WHERE id = ?', [archived ? 1 : 0, id]);
    return { success: true };
  } catch (e) {
    return { success: false, error: 'ERRO AO ARQUIVAR LOJA' };
  }
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
  await run(`INSERT INTO sales (id, total, discount, payment_method, vendedor, store_id, items) VALUES (?, ?, ?, ?, ?, ?, ?)`, [saleId, sale.total, sale.discount || 0, sale.payment_method, sale.vendedor, sale.store_id, JSON.stringify(sale.items)]);
  for (const item of sale.items) {
    if (String(item.id).startsWith('OS-')) continue;
    await run(`UPDATE inventory SET quantity = quantity - ? WHERE product_id = ? AND store_id = ?`, [item.qtd, item.id, sale.store_id]);
  }
  const commissionPercentage = 0.10;
  const commissionValue = sale.total * commissionPercentage;
  const commissionId = randomUUID();
  await run(`INSERT INTO commissions (id, sale_id, vendedor, value, percentage) VALUES (?, ?, ?, ?, ?)`, [commissionId, saleId, sale.vendedor, commissionValue, commissionPercentage * 100]);
  return { success: true, saleId };
});

ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.minimize();
});

ipcMain.on('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win?.isMaximized()) { win.unmaximize(); } else { win?.maximize(); }
});

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.close();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
