export interface ElectronAPI {
  getProductByBarcode: (barcode: string, storeId: string) => Promise<any>;
  getAllProducts: () => Promise<any[]>;
  saveManualProduct: (product: any) => Promise<boolean>;
  saveSale: (sale: any) => Promise<any>;
  importXmlProducts: (xmlData: string, storeId: string) => Promise<any>;
  getSyncStatus: () => Promise<{ pending: number, total: number }>;
  downloadProtocolTemplate: () => Promise<string>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}