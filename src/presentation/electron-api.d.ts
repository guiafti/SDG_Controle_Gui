export interface ElectronAPI {
  getProductByBarcode: (barcode: string, storeId: string) => Promise<any>;
  getAllProducts: () => Promise<any[]>;
  saveManualProduct: (product: any) => Promise<boolean>;
  saveSale: (sale: any) => Promise<any>;
  importXmlProducts: (xmlData: string, storeId: string) => Promise<any>;
  getSyncStatus: () => Promise<{ pending: number, total: number }>;
  downloadProtocolTemplate: () => Promise<string>;
  getStores: () => Promise<any[]>;
  getUsers: () => Promise<any[]>;
  login: (credentials: any) => Promise<any>;
  saveUser: (user: any) => Promise<any>;
  getCommissions: () => Promise<any[]>;
  getDashboardStats: () => Promise<{ totalRevenue: number, monthlyRevenue: number }>;
  getLowStockItems: () => Promise<any[]>;
  getStaleStockItems: () => Promise<any[]>;
  getSettings: () => Promise<{key: string, value: string}[]>;
  saveSettings: (settings: {key: string, value: string}[]) => Promise<any>;
  archiveProduct: (data: {id: string, archived: boolean}) => Promise<any>;
  updateInventoryQuantity: (data: {productId: string, storeId: string, quantity: number}) => Promise<any>;
  uploadProductImage: (data: {barcode: string, base64Data: string}) => Promise<any>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}