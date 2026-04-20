import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { initDatabase, get, run } from './database';
import { GuardianProtocol } from './GuardianProtocol';
import { SyncEngine } from './SyncEngine';

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
  await initDatabase();
  createWindow();
  SyncEngine.start();
});

// Handlers de Banco de Dados
ipcMain.handle('get-sync-status', async () => {
  const pending = await get('SELECT count(*) as count FROM sales WHERE synced = 0');
  const total = await get('SELECT count(*) as count FROM sales');
  return { pending: pending.count, total: total.count };
});

ipcMain.handle('get-product-by-barcode', async (_, barcode: string) => {
  return await get('SELECT * FROM products WHERE barcode = ?', [barcode]);
});

ipcMain.handle('save-sale', async (_, sale: any) => {
  const sql = `
    INSERT INTO sales (id, total, payment_method, vendedor, loja, items)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  return await run(sql, [
    crypto.randomUUID(),
    sale.total,
    sale.payment_method,
    sale.vendedor,
    sale.loja,
    JSON.stringify(sale.items)
  ]);
});

ipcMain.handle('import-products', async (_, data: any[]) => {
  const validProducts = GuardianProtocol.validate(data);
  if (validProducts.length === 0) throw new Error('Nenhum produto válido encontrado.');
  return await GuardianProtocol.bulkInsert(validProducts);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});