import { query, run, get } from './database';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

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
      }

      this.imagesDir = path.join(app.getPath('userData'), 'product_images');
      if (!fs.existsSync(this.imagesDir)) {
        fs.mkdirSync(this.imagesDir, { recursive: true });
      }

      const url = process.env.SUPABASE_URL || '';
      const key = process.env.SUPABASE_ANON_KEY || '';

      if (url && key && url !== 'SUA_URL_DO_SUPABASE_AQUI') {
        this.supabase = createClient(url, key);
        console.log('[SyncEngine] Supabase configurado.');
      }
    } catch (err) {
      console.error('[SyncEngine] Erro na inicialização:', err);
    }
  }

  static async start() {
    this.init();
    
    // Sincronização inicial ao abrir o app
    await this.pullFromCloud();

    // Tenta sincronizar a cada 30 segundos em segundo plano
    setInterval(() => {
      this.syncPendingSales();
      this.syncPendingProducts();
      this.pullFromCloud();
    }, 30000);
    
    this.syncPendingSales();
    this.syncPendingProducts();
  }

  static async pullFromCloud() {
    if (!this.supabase) return;

    try {
      console.log('[SyncEngine] Buscando atualizações da nuvem...');

      // 1. Sincronizar Lojas
      const { data: cloudStores } = await this.supabase.from('stores').select('*');
      if (cloudStores) {
        for (const s of cloudStores) {
          await run('INSERT OR REPLACE INTO stores (id, name, archived) VALUES (?, ?, ?)', 
            [s.id, s.name, s.archived ? 1 : 0]);
        }
      }

      // 2. Sincronizar Usuários (Para que logins funcionem em qualquer PC)
      const { data: cloudUsers } = await this.supabase.from('users').select('*');
      if (cloudUsers) {
        for (const u of cloudUsers) {
          await run('INSERT OR REPLACE INTO users (id, name, password, role) VALUES (?, ?, ?, ?)',
            [u.id, u.name, u.password, u.role]);
        }
      }

      // 3. Sincronizar Produtos
      const { data: cloudProds } = await this.supabase.from('products').select('*');
      if (cloudProds) {
        for (const p of cloudProds) {
          const isLocalSynced = await get('SELECT synced FROM products WHERE id = ?', [p.id]);
          if (!isLocalSynced || isLocalSynced.synced === 1) {
            await run('INSERT OR REPLACE INTO products (id, barcode, name, price, image, archived, synced) VALUES (?, ?, ?, ?, ?, ?, 1)', 
              [p.id, p.barcode, p.name, p.price, p.image, p.archived ? 1 : 0]);
          }
        }
      }

      // 4. Sincronizar Estoque (Inventory) - Fundamental para as 3 lojas
      const { data: cloudInv } = await this.supabase.from('inventory').select('*');
      if (cloudInv) {
        for (const i of cloudInv) {
          await run('INSERT OR REPLACE INTO inventory (product_id, store_id, quantity, min_stock, sale_tolerance_days) VALUES (?, ?, ?, ?, ?)',
            [i.product_id, i.store_id, i.quantity, i.min_stock, i.sale_tolerance_days]);
        }
      }

      console.log('[SyncEngine] Sincronização total concluída.');
    } catch (err) {
      console.error('[SyncEngine] Erro na sincronização total:', err);
    }
  }

  static async syncPendingProducts() {
    if (!this.supabase || this.isSyncing) return;

    const pendingProducts = await query('SELECT * FROM products WHERE synced = 0');
    const pendingInventory = await query('SELECT * FROM inventory'); // Sempre envia estoque atualizado

    this.isSyncing = true;

    // Envia Produtos
    for (const prod of pendingProducts) {
      try {
        let cloudImageUrl = prod.image;
        if (prod.image && !prod.image.startsWith('http')) {
          const filePath = path.join(this.imagesDir, prod.image);
          if (fs.existsSync(filePath)) {
            const { error: uploadError } = await this.supabase.storage
              .from('product-images')
              .upload(`products/${prod.image}`, fs.readFileSync(filePath), { upsert: true });
            if (!uploadError) {
              const { data: { publicUrl } } = this.supabase.storage.from('product-images').getPublicUrl(`products/${prod.image}`);
              cloudImageUrl = publicUrl;
            }
          }
        }

        const { error } = await this.supabase.from('products').upsert({
          id: prod.id, barcode: prod.barcode, name: prod.name, price: prod.price, image: cloudImageUrl, archived: prod.archived === 1
        });

        if (!error) await run('UPDATE products SET synced = 1, image = ? WHERE id = ?', [cloudImageUrl, prod.id]);
      } catch (e) { console.error(e); }
    }

    // Envia Estoque de todas as lojas deste produto
    for (const inv of pendingInventory) {
      try {
        await this.supabase.from('inventory').upsert({
          product_id: inv.product_id,
          store_id: inv.store_id,
          quantity: inv.quantity,
          min_stock: inv.min_stock,
          sale_tolerance_days: inv.sale_tolerance_days
        });
      } catch (e) { }
    }

    this.isSyncing = false;
  }

  static async syncPendingSales() {
    if (!this.supabase || this.isSyncing) return;
    
    const pendingSales = await query('SELECT * FROM sales WHERE synced = 0');
    if (pendingSales.length === 0) return;

    this.isSyncing = true;
    console.log(`[SyncEngine] Iniciando sincronização de ${pendingSales.length} vendas...`);

    for (const sale of pendingSales) {
      try {
        const success = await this.realCloudAPI(sale);
        if (success) {
          await run('UPDATE sales SET synced = 1 WHERE id = ?', [sale.id]);
        }
      } catch (error) {
        console.error(`[SyncEngine] Falha ao sincronizar venda ${sale.id}:`, error);
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
        .insert([
          {
            id: sale.id,
            store_id: sale.store_id,
            vendedor: sale.vendedor,
            total: sale.total,
            discount: sale.discount,
            payment_method: sale.payment_method,
            items: items,
            created_at: sale.created_at
          }
        ]);

      if (error) {
        console.error('[SyncEngine] Erro do Supabase:', error.message);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[SyncEngine] Erro de rede na sincronização:', err);
      return false;
    }
  }
}