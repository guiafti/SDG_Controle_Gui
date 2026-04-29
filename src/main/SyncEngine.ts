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
        this.pushToCloud();
        // Esperamos um pequeno delay antes de puxar, para dar tempo da nuvem processar o push
        setTimeout(() => this.pullFromCloud(), 5000);
      }
    }, 60000); // Aumentado para 60 segundos para maior estabilidade
    
    this.pushToCloud();
  }

  static async pushToCloud() {
    if (!this.supabase || this.isSyncing) return;
    this.isSyncing = true;
    try {
      logSync('Iniciando PUSH total para a nuvem...');

      // 1. Sincronizar Lojas Pendentes
      const stores = await query('SELECT * FROM stores');
      if (stores.length > 0) {
        const payload = stores.map(s => ({
          id: s.id, 
          name: String(s.name).trim().toUpperCase(), 
          archived: s.archived == 1 ? 1 : 0 
        }));
        console.log('[SYNC DEBUG] Payload Lojas (primeira):', payload[0]);
        
        const { error: err } = await this.supabase.from('stores').upsert(payload);
        if (err) {
          console.error('[SYNC ERROR] Erro PUSH lojas:', err);
          logSync(`Erro PUSH lojas: ${err.message}`);
        } else {
          console.log('[SYNC SUCCESS] Lojas sincronizadas.');
        }
      }

      // 2. Sincronizar Usuários
      const users = await query('SELECT * FROM users');
      if (users.length > 0) {
        const { error: err } = await this.supabase.from('users').upsert(users.map(u => ({
          id: u.id, name: u.name, password: u.password, role: u.role
        })));
        if (err) {
          console.error('[SYNC ERROR] Erro PUSH usuários:', err);
          logSync(`Erro PUSH usuários: ${err.message}`);
        }
      }

      // 3. Sincronizar Configurações
      const settings = await query('SELECT * FROM settings');
      if (settings.length > 0) {
        const { error: err } = await this.supabase.from('settings').upsert(settings.map(s => ({
          key: s.key, 
          value: String(s.value || '')
        })));
        if (err) {
          console.error('[SYNC ERROR] Erro PUSH settings:', err);
          logSync(`Erro PUSH settings: ${err.message}`);
        } else {
          console.log('[SYNC SUCCESS] Configurações sincronizadas.');
        }
      }

      // 4. Sincronizar Produtos e Imagens
      const pendingProducts = await query('SELECT * FROM products WHERE synced = 0');
      for (const prod of pendingProducts) {
        await this.syncSingleProduct(prod);
      }

      // 5. Sincronizar Estoque (Inventory) - Agora com CHUNKING para evitar timeouts
      await this.syncInventoryInChunks();

      // 6. Sincronizar Vendas Pendentes
      const pendingSales = await query('SELECT * FROM sales WHERE synced = 0');
      for (const sale of pendingSales) {
        const success = await this.realCloudAPI(sale);
        if (success) await run('UPDATE sales SET synced = 1 WHERE id = ?', [sale.id]);
      }

      logSync('PUSH total concluído.');
    } catch (e: any) {
      logSync(`FALHA NO PUSH TOTAL: ${e.message}`);
      console.error('[SYNC FATAL] Falha no push total:', e);
    }
    this.isSyncing = false;
  }

  private static async syncInventoryInChunks() {
    try {
      const inventory = await query('SELECT * FROM inventory');
      if (inventory.length === 0) return;

      const chunkSize = 50; // Sincronizar de 50 em 50 para estabilidade
      for (let i = 0; i < inventory.length; i += chunkSize) {
        const chunk = inventory.slice(i, i + chunkSize);
        const { error: invErr } = await this.supabase.from('inventory').upsert(chunk.map(item => ({
          product_id: item.product_id, 
          store_id: item.store_id, 
          quantity: Number(item.quantity || 0), 
          min_stock: Number(item.min_stock || 0), 
          sale_tolerance_days: Number(item.sale_tolerance_days || 0)
        })));

        if (invErr) {
          console.error(`[SYNC ERROR] Erro no chunk de estoque (${i}-${i + chunkSize}):`, invErr);
          logSync(`Erro PUSH estoque chunk: ${invErr.message}`);
        }
      }
      console.log('[SYNC SUCCESS] Estoque sincronizado (em chunks).');
    } catch (err: any) {
      console.error('[SYNC FATAL] Erro ao processar estoque:', err);
    }
  }

  private static async syncSingleProduct(prod: any) {
    try {
      let cloudImageUrl = prod.image;
      if (prod.image && !prod.image.startsWith('http')) {
        const filePath = path.join(this.imagesDir, prod.image);
        if (fs.existsSync(filePath)) {
          const { error: uploadError } = await this.supabase.storage
            .from('product-images')
            .upload(`products/${prod.image}`, fs.readFileSync(filePath), { upsert: true, contentType: 'image/png' });
          
          if (!uploadError) {
            const { data: { publicUrl } } = this.supabase.storage.from('product-images').getPublicUrl(`products/${prod.image}`);
            cloudImageUrl = publicUrl;
          } else {
            console.error(`[SYNC ERROR] Erro upload imagem ${prod.image}:`, uploadError);
          }
        }
      }

      const payload = {
        id: prod.id,
        barcode: String(prod.barcode || ''),
        name: String(prod.name || ''),
        price: Number(prod.price || 0),
        image: cloudImageUrl,
        archived: prod.archived == 1 ? 1 : 0, 
        category_id: prod.category_id || null
      };

      const { error } = await this.supabase.from('products').upsert(payload);

      if (error) {
        console.error(`[SYNC ERROR] Erro ao sincronizar produto ${prod.id} (${prod.name}):`, error);
        logSync(`Erro Supabase Produto ${prod.id}: ${error.message} - Detalhes: ${JSON.stringify(error)}`);
        return false;
      }
      
      await run('UPDATE products SET synced = 1, image = ? WHERE id = ?', [cloudImageUrl, prod.id]);
      console.log(`[SYNC SUCCESS] Produto ${prod.name} sincronizado.`);
      return true;
    } catch (err: any) {
      console.error(`[SYNC FATAL] Exceção ao sincronizar produto ${prod.id}:`, err);
      return false;
    }
  }

  static async pullFromCloud() {
    if (!this.supabase) return;
    try {
      logSync('Iniciando PULL da nuvem...');

      // 1. Lojas
      const { data: cloudStores, error: se } = await this.supabase.from('stores').select('*');
      if (se) console.error('[SYNC ERROR] Erro Pull Lojas:', se);
      if (cloudStores) {
        for (const s of cloudStores) {
          await run('INSERT OR REPLACE INTO stores (id, name, archived) VALUES (?, ?, ?)', [s.id, s.name, s.archived ? 1 : 0]);
        }
      }

      // 2. Usuários
      const { data: cloudUsers, error: ue } = await this.supabase.from('users').select('*');
      if (ue) console.error('[SYNC ERROR] Erro Pull Usuários:', ue);
      if (cloudUsers) {
        for (const u of cloudUsers) {
          await run('INSERT OR REPLACE INTO users (id, name, password, role) VALUES (?, ?, ?, ?)', [u.id, u.name, u.password, u.role]);
        }
      }

      // 3. Produtos
      const { data: cloudProds, error: pe } = await this.supabase.from('products').select('*');
      if (pe) console.error('[SYNC ERROR] Erro Pull Produtos:', pe);
      if (cloudProds) {
        for (const p of cloudProds) {
          const local = await get('SELECT synced FROM products WHERE id = ?', [p.id]);
          if (!local || local.synced === 1) {
            await run('INSERT OR REPLACE INTO products (id, barcode, name, price, image, archived, synced) VALUES (?, ?, ?, ?, ?, ?, 1)', 
              [p.id, p.barcode, p.name, p.price, p.image, p.archived ? 1 : 0]);
          }
        }
      }

      // 4. Estoque
      const { data: cloudInv, error: ie } = await this.supabase.from('inventory').select('*');
      if (ie) console.error('[SYNC ERROR] Erro Pull Estoque:', ie);
      if (cloudInv) {
        for (const i of cloudInv) {
          await run('INSERT OR REPLACE INTO inventory (product_id, store_id, quantity, min_stock, sale_tolerance_days) VALUES (?, ?, ?, ?, ?)',
            [i.product_id, i.store_id, i.quantity, i.min_stock, i.sale_tolerance_days]);
        }
      }

      logSync('PULL finalizado com sucesso.');
    } catch (err: any) {
      logSync(`FALHA NO PULL: ${err.message}`);
      console.error('[SYNC FATAL] Falha no pull:', err);
    }
  }

  static async syncPendingProducts() {
    if (!this.supabase || this.isSyncing) return;
    this.isSyncing = true;
    try {
      const pendingProducts = await query('SELECT * FROM products WHERE synced = 0');
      if (pendingProducts.length > 0) {
        console.log(`[SYNC] Sincronizando ${pendingProducts.length} produtos pendentes...`);
        for (const prod of pendingProducts) {
          await this.syncSingleProduct(prod);
        }
      }
      await this.syncInventoryInChunks();
    } catch (err: any) {
      console.error('[SYNC FATAL] Falha ao sincronizar produtos pendentes:', err);
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
        console.error(`[SYNC ERROR] Erro Supabase Venda ${sale.id}:`, error);
        logSync(`Erro Supabase Venda: ${error.message}`);
        return false;
      }
      return true;
    } catch (err: any) {
      console.error(`[SYNC FATAL] Erro Rede Venda ${sale.id}:`, err);
      logSync(`Erro Rede Venda: ${err.message}`);
      return false;
    }
  }
}
