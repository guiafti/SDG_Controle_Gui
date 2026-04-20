import { query, run } from './database';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { app } from 'electron';

// Carrega as variáveis do arquivo .env (relativo a raiz do projeto/executável)
const envPath = app.isPackaged 
  ? path.join(process.resourcesPath, '.env') 
  : path.join(process.cwd(), '.env');
dotenv.config({ path: envPath });

// Lê as credenciais do .env
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Inicializa o cliente apenas se tiver as credenciais
const isConfigured = SUPABASE_URL && SUPABASE_URL !== 'SUA_URL_DO_SUPABASE_AQUI';
const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export class SyncEngine {
  private static isSyncing = false;

  static async start() {
    // Tenta sincronizar a cada 30 segundos em segundo plano
    setInterval(() => this.syncPendingSales(), 30000);
    this.syncPendingSales();
  }

  static async syncPendingSales() {
    if (this.isSyncing) return;
    
    // Busca todas as vendas que ainda não foram enviadas para a nuvem
    const pendingSales = await query('SELECT * FROM sales WHERE synced = 0');
    
    if (pendingSales.length === 0) return;

    this.isSyncing = true;
    console.log(`[SyncEngine] Iniciando sincronização de ${pendingSales.length} vendas...`);

    for (const sale of pendingSales) {
      try {
        const success = await this.realCloudAPI(sale);
        if (success) {
          // Marca como sincronizado no SQLite local para não enviar de novo
          await run('UPDATE sales SET synced = 1 WHERE id = ?', [sale.id]);
          console.log(`[SyncEngine] Venda ${sale.id} sincronizada com sucesso.`);
        }
      } catch (error) {
        console.error(`[SyncEngine] Falha ao sincronizar venda ${sale.id}:`, error);
      }
    }

    this.isSyncing = false;
  }

  private static async realCloudAPI(sale: any): Promise<boolean> {
    // Se a URL do Supabase não foi configurada, aborta e simula falha
    if (SUPABASE_URL === 'SUA_SUPABASE_URL_AQUI') {
      console.warn('[SyncEngine] Supabase não configurado. Insira a URL e a KEY no arquivo SyncEngine.ts.');
      return false;
    }

    try {
      // Converte a string de itens de volta para JSON para salvar bonitinho no banco de dados
      const items = JSON.parse(sale.items);

      // Dispara o comando de INSERT (inserção) para a tabela "sales" lá no Supabase
      const { error } = await supabase
        .from('sales')
        .insert([
          {
            id: sale.id, // Envia o mesmo ID gerado pelo PDV offline
            store_id: sale.store_id,
            vendedor: sale.vendedor,
            total: sale.total,
            discount: sale.discount,
            payment_method: sale.payment_method,
            items: items, // Salvo como JSONB no Postgres do Supabase
            created_at: sale.created_at
          }
        ]);

      if (error) {
        // Ocorreu um erro no lado do servidor (ex: tabela não existe, erro de formato, etc)
        console.error('[SyncEngine] Erro do Supabase:', error.message);
        return false;
      }

      return true; // Sucesso, venda salva na nuvem!
    } catch (err) {
      // Erro de rede (loja sem internet)
      console.error('[SyncEngine] Erro de rede na sincronização:', err);
      return false;
    }
  }
}