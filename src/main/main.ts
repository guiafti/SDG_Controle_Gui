import { app, BrowserWindow, ipcMain, protocol, net } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';
import { initDatabase, get, run, query } from './database';
import { GuardianProtocol } from './GuardianProtocol';
import { SyncEngine } from './SyncEngine';
import { randomUUID } from 'node:crypto';

// Registrar privilégios do protocolo ANTES do app ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-img', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

const UPLOAD_PATH = path.join(app.getPath('userData'), 'product_images');
if (!fs.existsSync(UPLOAD_PATH)) fs.mkdirSync(UPLOAD_PATH, { recursive: true });

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
    
    // Handler para o protocolo customizado de imagens (Correção definitiva para Windows)
    protocol.handle('local-img', (request) => {
      try {
        const urlPath = request.url.replace('local-img://', '');
        const fileName = path.basename(decodeURIComponent(urlPath));
        const filePath = path.join(UPLOAD_PATH, fileName);
        
        if (!fs.existsSync(filePath)) {
          console.warn(`[SISTEMA] Imagem não encontrada: ${filePath}`);
          return new Response('Not Found', { status: 404 });
        }
        
        return net.fetch(pathToFileURL(filePath).toString());
      } catch (e) {
        console.error('[SISTEMA] Erro no protocolo local-img:', e);
        return new Response('Error', { status: 500 });
      }
    });

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

ipcMain.handle('upload-product-image', async (_, { barcode, base64Data }) => {
  try {
    const fileName = `${barcode}.png`;
    const filePath = path.join(UPLOAD_PATH, fileName);
    const buffer = Buffer.from(base64Data.split(',')[1], 'base64');
    fs.writeFileSync(filePath, buffer);
    return { success: true, fileName };
  } catch (error) {
    console.error('Erro ao salvar imagem:', error);
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
      // Ao editar, resetamos o 'synced' para 0 para que a nuvem receba a atualização
      await run('UPDATE products SET name = ?, barcode = ?, price = ?, image = ?, synced = 0 WHERE id = ?', [name, barcode, price, image, p.id]);
    } else {
      const existing = await get('SELECT id FROM products WHERE barcode = ?', [barcode]);
      if (existing) return { success: false, error: 'ESSE CÓDIGO JÁ EXISTE NO SISTEMA!' };

      const newId = randomUUID();
      await run('INSERT INTO products (id, name, barcode, price, image) VALUES (?, ?, ?, ?, ?)', [newId, name, barcode, price, image]);
      await run('INSERT OR IGNORE INTO inventory (product_id, store_id, quantity) VALUES (?, "1", 0), (?, "2", 0), (?, "3", 0)', [newId, newId, newId]);
    }
    return { success: true };
  } catch (error: any) {
    console.error('[ERRO SALVAR]', error);
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
  return await query(`
    SELECT p.*, 
    COALESCE((SELECT quantity FROM inventory WHERE product_id = p.id AND store_id = '1'), 0) as stock_1,
    COALESCE((SELECT min_stock FROM inventory WHERE product_id = p.id AND store_id = '1'), 2) as min_1,
    COALESCE((SELECT sale_tolerance_days FROM inventory WHERE product_id = p.id AND store_id = '1'), 30) as stale_1,
    COALESCE((SELECT quantity FROM inventory WHERE product_id = p.id AND store_id = '2'), 0) as stock_2,
    COALESCE((SELECT min_stock FROM inventory WHERE product_id = p.id AND store_id = '2'), 2) as min_2,
    COALESCE((SELECT sale_tolerance_days FROM inventory WHERE product_id = p.id AND store_id = '2'), 30) as stale_2,
    COALESCE((SELECT quantity FROM inventory WHERE product_id = p.id AND store_id = '3'), 0) as stock_3,
    COALESCE((SELECT min_stock FROM inventory WHERE product_id = p.id AND store_id = '3'), 2) as min_3,
    COALESCE((SELECT sale_tolerance_days FROM inventory WHERE product_id = p.id AND store_id = '3'), 30) as stale_3
    FROM products p ORDER BY p.archived ASC, p.name ASC
  `);
});

ipcMain.handle('get-low-stock-items', async () => {
  try {
    const items = await query(`
      SELECT 
        p.id,
        p.name, 
        p.barcode,
        COALESCE((SELECT quantity FROM inventory WHERE product_id = p.id AND store_id = '1'), 0) as stock_1,
        COALESCE((SELECT quantity FROM inventory WHERE product_id = p.id AND store_id = '2'), 0) as stock_2,
        COALESCE((SELECT quantity FROM inventory WHERE product_id = p.id AND store_id = '3'), 0) as stock_3,
        COALESCE((SELECT min_stock FROM inventory WHERE product_id = p.id AND store_id = '1'), 2) as min_1,
        COALESCE((SELECT min_stock FROM inventory WHERE product_id = p.id AND store_id = '2'), 2) as min_2,
        COALESCE((SELECT min_stock FROM inventory WHERE product_id = p.id AND store_id = '3'), 2) as min_3
      FROM products p
      WHERE p.archived = 0 AND EXISTS (
        SELECT 1 FROM inventory i 
        WHERE i.product_id = p.id 
        AND i.quantity <= COALESCE(i.min_stock, 2)
      )
      ORDER BY p.name ASC
      LIMIT 20
    `);
    return items;
  } catch (e) {
    console.error('[ERRO DASHBOARD QUERY]', e);
    return [];
  }
});

ipcMain.handle('get-stale-stock-items', async () => {
  try {
    const items = await query(`
      SELECT 
        p.id, p.name, p.barcode,
        COALESCE((SELECT quantity FROM inventory WHERE product_id = p.id AND store_id = '1'), 0) as stock_1,
        COALESCE((SELECT quantity FROM inventory WHERE product_id = p.id AND store_id = '2'), 0) as stock_2,
        COALESCE((SELECT quantity FROM inventory WHERE product_id = p.id AND store_id = '3'), 0) as stock_3,
        COALESCE((SELECT sale_tolerance_days FROM inventory WHERE product_id = p.id AND store_id = '1'), 30) as stale_1,
        COALESCE((SELECT sale_tolerance_days FROM inventory WHERE product_id = p.id AND store_id = '2'), 30) as stale_2,
        COALESCE((SELECT sale_tolerance_days FROM inventory WHERE product_id = p.id AND store_id = '3'), 30) as stale_3
      FROM products p
      WHERE p.archived = 0 
      AND (SELECT SUM(quantity) FROM inventory WHERE product_id = p.id) > 0
      AND EXISTS (
        SELECT 1 FROM inventory i 
        WHERE i.product_id = p.id 
        AND i.quantity > 0
        AND p.id NOT IN (
          SELECT DISTINCT json_each.value->>'$.id'
          FROM sales, json_each(sales.items)
          WHERE sales.created_at > date('now', '-' || COALESCE(i.sale_tolerance_days, 30) || ' days')
        )
      )
      ORDER BY p.name ASC
      LIMIT 20
    `);
    return items;
  } catch (e) {
    console.error('[ERRO STALE STOCK]', e);
    return [];
  }
});

ipcMain.handle('get-sync-status', async () => {
  const pending = await get('SELECT count(*) as count FROM sales WHERE synced = 0');
  const total = await get('SELECT count(*) as count FROM sales');
  return { pending: pending?.count || 0, total: total?.count || 0 };
});

ipcMain.handle('get-product-by-barcode', async (_, barcode: string, storeId: string) => {
  const product = await get(`
    SELECT p.*, 
    COALESCE((SELECT quantity FROM inventory WHERE product_id = p.id AND store_id = '1'), 0) as stock_1,
    COALESCE((SELECT min_stock FROM inventory WHERE product_id = p.id AND store_id = '1'), 2) as min_1,
    COALESCE((SELECT quantity FROM inventory WHERE product_id = p.id AND store_id = '2'), 0) as stock_2,
    COALESCE((SELECT min_stock FROM inventory WHERE product_id = p.id AND store_id = '2'), 2) as min_2,
    COALESCE((SELECT quantity FROM inventory WHERE product_id = p.id AND store_id = '3'), 0) as stock_3,
    COALESCE((SELECT min_stock FROM inventory WHERE product_id = p.id AND store_id = '3'), 2) as min_3
    FROM products p WHERE p.barcode = ? AND p.archived = 0
  `, [cleanBarcode(barcode)]);
  
  if (product && storeId) {
    product.stock = product[`stock_${storeId}`] || 0;
    product.min_stock = product[`min_${storeId}`] || 2;
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

ipcMain.handle('get-stores', async (_, includeArchived = false) => {
  if (includeArchived) {
    return await query('SELECT * FROM stores ORDER BY archived ASC, name ASC');
  }
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