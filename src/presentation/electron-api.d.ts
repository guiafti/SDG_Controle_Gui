export interface ElectronAPI {
  getProductByBarcode: (barcode: string) => Promise<any>;
  saveSale: (sale: any) => Promise<any>;
  importProducts: (data: any[]) => Promise<number>;
  getSyncStatus: () => Promise<{ pending: number, total: number }>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}