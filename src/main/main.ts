import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { initDatabase, get, run, query } from './database';
import { GuardianProtocol } from './GuardianProtocol';
import { SyncEngine } from './SyncEngine';
import { randomUUID } from 'crypto';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../index.html'));
  }
}

app.whenReady().then(async () => {
  try {
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

ipcMain.handle('save-sale', async (_, sale: any) => {
  const saleId = randomUUID();
  for (const item of sale.items) {
    await run(`UPDATE inventory SET quantity = quantity - ? WHERE product_id = ? AND store_id = ?`, [item.qtd, item.id, sale.store_id]);
  }
  return await run(`INSERT INTO sales (id, total, payment_method, vendedor, store_id, items) VALUES (?, ?, ?, ?, ?, ?)`, 
    [saleId, sale.total, sale.payment_method, sale.vendedor, sale.store_id, JSON.stringify(sale.items)]);
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });