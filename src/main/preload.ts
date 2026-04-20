import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getProductByBarcode: (barcode: string, storeId: string) => ipcRenderer.invoke('get-product-by-barcode', barcode, storeId),
  getAllProducts: () => ipcRenderer.invoke('get-all-products'),
  saveManualProduct: (product: any) => ipcRenderer.invoke('save-manual-product', product),
  saveSale: (sale: any) => ipcRenderer.invoke('save-sale', sale),
  importXmlProducts: (xmlData: string, storeId: string) => ipcRenderer.invoke('import-xml-products', xmlData, storeId),
  getSyncStatus: () => ipcRenderer.invoke('get-sync-status'),
  downloadProtocolTemplate: () => ipcRenderer.invoke('download-protocol-template'),
});