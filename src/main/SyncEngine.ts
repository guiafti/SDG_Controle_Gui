import { query, run } from './database';

export class SyncEngine {
  private static isSyncing = false;

  static async start() {
    setInterval(() => this.syncPendingSales(), 30000);
    this.syncPendingSales();
  }

  static async syncPendingSales() {
    if (this.isSyncing) return;
    
    const pendingSales = await query('SELECT * FROM sales WHERE synced = 0');
    
    if (pendingSales.length === 0) return;

    this.isSyncing = true;

    for (const sale of pendingSales) {
      try {
        const success = await this.mockCloudAPI(sale);
        if (success) {
          await run('UPDATE sales SET synced = 1 WHERE id = ?', [sale.id]);
        }
      } catch (error) {
        console.error(`[SyncEngine] Falha ao sincronizar:`, error);
      }
    }

    this.isSyncing = false;
  }

  private static async mockCloudAPI(sale: any): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const isOnline = Math.random() > 0.1;
        resolve(isOnline);
      }, 1000);
    });
  }
}