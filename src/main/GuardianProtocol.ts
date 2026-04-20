import { run } from './database';

interface ProductImport {
  barcode: string;
  name: string;
  price: number;
  image?: string;
  stock?: number;
}

export class GuardianProtocol {
  static validate(data: any[]): ProductImport[] {
    return data.filter(item => {
      const hasBarcode = typeof item.barcode === 'string' && item.barcode.length > 0;
      const hasName = typeof item.name === 'string' && item.name.length > 0;
      const hasPrice = typeof item.price === 'number' && item.price > 0;
      
      return hasBarcode && hasName && hasPrice;
    });
  }

  static async bulkInsert(products: ProductImport[]) {
    let count = 0;
    for (const p of products) {
      const id = crypto.randomUUID();
      await run(`
        INSERT OR REPLACE INTO products (id, barcode, name, price, image, stock)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id, p.barcode, p.name, p.price, p.image || '', p.stock || 0]);
      count++;
    }
    return count;
  }
}