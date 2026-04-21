import { query, run, get } from './database';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

// Função auxiliar de log para o SyncEngine
const logSync = (msg: string) => {
  try {
    const LOG_FILE = path.join(app.getPath('userData'), 'error.log');
    const time = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[SYNC ${time}] ${msg}\n`);
  } catch (e) {}
};

export class SyncEngine {
  private static isSyncing = false;
  private static supabase: any = null;
  private static imagesDir: string = '';

  static init() {
    try {
      const envPath = app.isPackaged 
        ? path.join(process.resourcesPath, '.env') 
        : path.join(process.cwd(), '.env');
      
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        logSync(`Configuração carregada de ${envPath}`);
      }

      this.imagesDir = path.join(app.getPath('userData'), 'product_images');
      if (!fs.existsSync(this.imagesDir)) {
        fs.mkdirSync(this.imagesDir, { recursive: true });
      }
      
      const url = process.env.SUPABASE_URL || '';
      const key = process.env.SUPABASE_ANON_KEY || '';

      if (url && key && url !== 'SUA_URL_DO_SUPABASE_AQUI' && url !== '') {
        this.supabase = createClient(url, key);
        logSync('Cliente Supabase instanciado com sucesso.');
      } else {
        logSync('ERRO: Supabase não configurado ou chaves inválidas no .env');
      }
    } catch (err: any) {
      logSync(`ERRO NA INICIALIZAÇÃO: ${err.message}`);
    }
  }

  static async start() {
    this.init();
    await this.pullFromCloud();

    setInterval(() => {
      if (!this.isSyncing) {
        this.syncPendingSales();
        this.syncPendingProducts();
        this.pullFromCloud();
      }
    }, 30000);
    
    this.syncPendingSales();
    this.syncPendingProducts();
  }

  static async pullFromCloud() {
    if (!this.supabase) return;
    try {
      logSync('Iniciando PULL da nuvem...');

      // 1. Lojas
      const { data: cloudStores, error: se } = await this.supabase.from('stores').select('*');
      if (se) logSync(`Erro ao puxar lojas: ${se.message}`);
      if (cloudStores) {
        for (const s of cloudStores) {
          await run('INSERT OR REPLACE INTO stores (id, name, archived) VALUES (?, ?, ?)', [s.id, s.name, s.archived ? 1 : 0]);
        }
      }

      // 2. Usuários
      const { data: cloudUsers, error: ue } = await this.supabase.from('users').select('*');
      if (ue) logSync(`Erro ao puxar usuários: ${ue.message}`);
      if (cloudUsers) {
        for (const u of cloudUsers) {
          await run('INSERT OR REPLACE INTO users (id, name, password, role) VALUES (?, ?, ?, ?)', [u.id, u.name, u.password, u.role]);
        }
      }

      // 3. Produtos
      const { data: cloudProds, error: pe } = await this.supabase.from('products').select('*');
      if (pe) logSync(`Erro ao puxar produtos: ${pe.message}`);
      if (cloudProds) {
        logSync(`Recebidos ${cloudProds.length} produtos da nuvem.`);
        for (const p of cloudProds) {
          const isLocalSynced = await get('SELECT synced FROM products WHERE id = ?', [p.id]);
          if (!isLocalSynced || isLocalSynced.synced === 1) {
            await run('INSERT OR REPLACE INTO products (id, barcode, name, price, image, archived, synced) VALUES (?, ?, ?, ?, ?, ?, 1)', 
              [p.id, p.barcode, p.name, p.price, p.image, p.archived ? 1 : 0]);
          }
        }
      }

      // 4. Estoque
      const { data: cloudInv, error: ie } = await this.supabase.from('inventory').select('*');
      if (ie) logSync(`Erro ao puxar estoque: ${ie.message}`);
      if (cloudInv) {
        for (const i of cloudInv) {
          await run('INSERT OR REPLACE INTO inventory (product_id, store_id, quantity, min_stock, sale_tolerance_days) VALUES (?, ?, ?, ?, ?)',
            [i.product_id, i.store_id, i.quantity, i.min_stock, i.sale_tolerance_days]);
        }
      }

      logSync('PULL finalizado com sucesso.');
    } catch (err: any) {
      logSync(`FALHA NO PULL: ${err.message}`);
    }
  }

  static async syncPendingProducts() {
    if (!this.supabase || this.isSyncing) return;
    this.isSyncing = true;
    try {
      const pendingProducts = await query('SELECT * FROM products WHERE synced = 0');
      if (pendingProducts.length > 0) {
        logSync(`Enviando ${pendingProducts.length} produtos pendentes...`);
        for (const prod of pendingProducts) {
          let cloudImageUrl = prod.image;
          if (prod.image && !prod.image.startsWith('http')) {
            const filePath = path.join(this.imagesDir, prod.image);
            if (fs.existsSync(filePath)) {
              logSync(`Subindo imagem: ${prod.image}...`);
              const { error: uploadError } = await this.supabase.storage
                .from('product-images')
                .upload(`products/${prod.image}`, fs.readFileSync(filePath), { upsert: true, contentType: 'image/png' });
              
              if (uploadError) {
                logSync(`Erro no upload da imagem ${prod.image}: ${uploadError.message}`);
              } else {
                const { data: { publicUrl } } = this.supabase.storage
                  .from('product-images')
                  .getPublicUrl(`products/${prod.image}`);
                cloudImageUrl = publicUrl;
                logSync(`Imagem disponível em: ${cloudImageUrl}`);
              }
            }
          }
          const { error } = await this.supabase.from('products').upsert({
            id: prod.id, barcode: prod.barcode, name: prod.name, price: prod.price, image: cloudImageUrl, archived: prod.archived === 1
          });
          if (!error) {
            await run('UPDATE products SET synced = 1, image = ? WHERE id = ?', [cloudImageUrl, prod.id]);
            logSync(`Produto ${prod.name} sincronizado na nuvem.`);
          } else {
            logSync(`Erro ao subir produto ${prod.name}: ${error.message}`);
          }
        }
      }

      const inventory = await query('SELECT * FROM inventory');
      if (inventory.length > 0) {
        const { error: invErr } = await this.supabase.from('inventory').upsert(inventory.map(i => ({
          product_id: i.product_id,
          store_id: i.store_id,
          quantity: i.quantity,
          min_stock: i.min_stock,
          sale_tolerance_days: i.sale_tolerance_days
        })));
        if (invErr) logSync(`Erro ao subir estoque: ${invErr.message}`);
      }
    } catch (err: any) {
      logSync(`FALHA NO PUSH DE PRODUTOS: ${err.message}`);
    }
    this.isSyncing = false;
  }

  static async syncPendingSales() {
    if (!this.supabase || this.isSyncing) return;
    
    const pendingSales = await query('SELECT * FROM sales WHERE synced = 0');
    if (pendingSales.length === 0) return;

    this.isSyncing = true;
    logSync(`Sincronizando ${pendingSales.length} vendas pendentes...`);

    for (const sale of pendingSales) {
      try {
        const success = await this.realCloudAPI(sale);
        if (success) {
          await run('UPDATE sales SET synced = 1 WHERE id = ?', [sale.id]);
          logSync(`Venda ${sale.id} sincronizada.`);
        }
      } catch (error: any) {
        logSync(`Falha ao sincronizar venda ${sale.id}: ${error.message}`);
      }
    }

    this.isSyncing = false;
  }

  private static async realCloudAPI(sale: any): Promise<boolean> {
    if (!this.supabase) return false;
    try {
      const items = JSON.parse(sale.items);
      const { error } = await this.supabase
        .from('sales')
        .insert([{
          id: sale.id, store_id: sale.store_id, vendedor: sale.vendedor,
          total: sale.total, discount: sale.discount, payment_method: sale.payment_method,
          items: items, created_at: sale.created_at
        }]);

      if (error) {
        logSync(`Erro Supabase Venda: ${error.message}`);
        return false;
      }
      return true;
    } catch (err: any) {
      logSync(`Erro Rede Venda: ${err.message}`);
      return false;
    }
  }
}
