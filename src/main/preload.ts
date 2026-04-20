import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getProductByBarcode: (barcode: string) => ipcRenderer.invoke('get-product-by-barcode', barcode),
  saveSale: (sale: any) => ipcRenderer.invoke('save-sale', sale),
  importProducts: (data: any[]) => ipcRenderer.invoke('import-products', data),
  getSyncStatus: () => ipcRenderer.invoke('get-sync-status'),
});