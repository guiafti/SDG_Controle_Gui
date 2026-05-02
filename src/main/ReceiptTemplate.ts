export const generateReceiptHTML = (sale: any, storeName: string, logo?: string) => {
  const date = new Date().toLocaleString('pt-BR');
  const itemsHTML = sale.items.map((item: any) => `
    <tr>
      <td style="padding: 5px 0;">${item.nome}<br/><small>${item.qtd}x ${item.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</small></td>
      <td style="text-align: right; vertical-align: top; padding: 5px 0;">${(item.qtd * item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
    </tr>
  `).join('');

  const subtotal = sale.items.reduce((acc: number, item: any) => acc + (item.preco * item.qtd), 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { 
          font-family: 'Courier New', Courier, monospace; 
          width: 80mm; 
          margin: 0; 
          padding: 10px;
          font-size: 12px;
          line-height: 1.2;
        }
        .text-center { text-align: center; }
        .header { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
        .logo { max-width: 50mm; margin-bottom: 5px; }
        .store-name { font-weight: bold; font-size: 16px; text-transform: uppercase; }
        .divider { border-top: 1px dashed #000; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; }
        .totals { margin-top: 10px; font-weight: bold; }
        .footer { margin-top: 20px; font-size: 10px; }
        @media print {
          @page { margin: 0; }
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header text-center">
        ${logo ? `<img src="${logo}" class="logo" />` : ''}
        <div class="store-name">${storeName}</div>
        <div>Comprovante de Venda</div>
        <div>Data: ${date}</div>
      </div>

      <table>
        <thead>
          <tr style="border-bottom: 1px solid #000;">
            <th style="text-align: left;">DESCRIÇÃO</th>
            <th style="text-align: right;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <div class="divider"></div>

      <table class="totals">
        <tr>
          <td>SUBTOTAL:</td>
          <td style="text-align: right;">${subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        </tr>
        ${sale.discount > 0 ? `
          <tr>
            <td>DESCONTO:</td>
            <td style="text-align: right;">- ${sale.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
          </tr>
        ` : ''}
        <tr style="font-size: 18px;">
          <td>TOTAL PAGO:</td>
          <td style="text-align: right;">${sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        </tr>
      </table>

      <div class="divider"></div>
      
      <div class="text-center">
        <div>Forma de Pagamento: <strong>${sale.payment_method}</strong></div>
        <div>Vendedor: ${sale.vendedor}</div>
      </div>

      <div class="footer text-center">
        <div>Obrigado pela preferência!</div>
        <div>SDG CONTROL Enterprise</div>
        <div style="margin-top: 5px;">${sale.id.substring(0, 8)}</div>
      </div>
      
      <script>
        // Auto print when loaded
        window.onload = () => {
          window.print();
          setTimeout(() => {
            window.close();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;
};