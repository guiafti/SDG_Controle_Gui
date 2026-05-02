export interface ElectronAPI {
  getProductByBarcode: (barcode: string, storeId: string) => Promise<any>;
  getAllProducts: () => Promise<any[]>;
  saveManualProduct: (product: any) => Promise<boolean>;
  saveSale: (sale: any) => Promise<any>;
  importXmlProducts: (xmlData: string, storeId: string) => Promise<any>;
  getSyncStatus: () => Promise<{ pending: number, total: number }>;
  getRepairs: () => Promise<any[]>;
  saveRepair: (repair: any) => Promise<any>;
  updateRepairStatus: (data: {id: string, status: string, current_store_id: string}) => Promise<any>;
  updateRepairNotes: (data: {id: string, technical_notes: string}) => Promise<any>;
  updateRepairPayment: (data: {id: string, payment_status: string}) => Promise<any>;
  uploadRepairImage: (data: {id: string, base64Data: string}) => Promise<any>;
  downloadProtocolTemplate: () => Promise<string>;
  getStores: (includeArchived?: boolean) => Promise<any[]>;
  saveStore: (store: {id?: string, name: string}) => Promise<{success: boolean, error?: string}>;
  archiveStore: (data: {id: string, archived: boolean}) => Promise<{success: boolean, error?: string}>;
  getUsers: () => Promise<any[]>;
  login: (credentials: any) => Promise<any>;
  saveUser: (user: any) => Promise<any>;
  getCommissions: () => Promise<any[]>;
  getExpenses: () => Promise<any[]>;
  saveExpense: (expense: any) => Promise<any>;
  deleteExpense: (id: string) => Promise<any>;
  getExpenseCategories: () => Promise<any[]>;
  saveExpenseCategory: (category: any) => Promise<any>;
  getFinancialSummary: () => Promise<{totalInflow: number, totalOutflow: number, netProfit: number}>;
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