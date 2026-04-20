import { query, run, get } from './database';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

// Carrega as variáveis do arquivo .env (relativo a raiz do projeto/executável)
const envPath = app.isPackaged 
  ? path.join(process.resourcesPath, '.env') 
  : path.join(process.cwd(), '.env');
dotenv.config({ path: envPath });

const IMAGES_DIR = path.join(app.getPath('userData'), 'product_images');

// Lê as credenciais do .env
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Inicializa o cliente apenas se tiver as credenciais
const isConfigured = SUPABASE_URL && SUPABASE_URL !== 'SUA_URL_DO_SUPABASE_AQUI' && SUPABASE_URL !== '';
const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export class SyncEngine {
  private static isSyncing = false;

  static async start() {
    // Tenta sincronizar a cada 30 segundos em segundo plano
    setInterval(() => {
      this.syncPendingSales();
      this.syncPendingProducts();
    }, 30000);
    
    this.syncPendingSales();
    this.syncPendingProducts();
  }

  static async syncPendingProducts() {
    if (!supabase || this.isSyncing) return;

    const pendingProducts = await query('SELECT * FROM products WHERE synced = 0');
    if (pendingProducts.length === 0) return;

    this.isSyncing = true;
    console.log(`[SyncEngine] Sincronizando ${pendingProducts.length} produtos...`);

    for (const prod of pendingProducts) {
      try {
        let cloudImageUrl = prod.image;

        // Se o produto tem uma imagem local e não é um link HTTP
        if (prod.image && !prod.image.startsWith('http')) {
          const filePath = path.join(IMAGES_DIR, prod.image);
          if (fs.existsSync(filePath)) {
            const fileBuffer = fs.readFileSync(filePath);
            
            // Upload para o Bucket 'product-images' no Supabase
            const { data, error: uploadError } = await supabase.storage
              .from('product-images')
              .upload(`products/${prod.image}`, fileBuffer, {
                contentType: 'image/png',
                upsert: true
              });

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(`products/${prod.image}`);
              cloudImageUrl = publicUrl;
            }
          }
        }

        // Upsert do produto no banco online
        const { error } = await supabase
          .from('products')
          .upsert({
            id: prod.id,
            barcode: prod.barcode,
            name: prod.name,
            price: prod.price,
            image: cloudImageUrl,
            archived: prod.archived === 1,
            created_at: prod.created_at
          });

        if (!error) {
          await run('UPDATE products SET synced = 1, image = ? WHERE id = ?', [cloudImageUrl, prod.id]);
        }
      } catch (err) {
        console.error(`[SyncEngine] Erro ao sincronizar produto ${prod.barcode}:`, err);
      }
    }
    this.isSyncing = false;
  }

  static async syncPendingSales() {
    if (!supabase || this.isSyncing) return;
    
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
    if (!supabase) return false;

    try {
      const items = JSON.parse(sale.items);
      const { error } = await supabase
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