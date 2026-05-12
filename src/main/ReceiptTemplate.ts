export const generateRepairReceiptHTML = (repair: any, storeName: string, logo?: string) => {
  const dateStr = repair.created_at ? new Date(repair.created_at).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
  const deliveryDate = repair.delivery_date ? new Date(repair.delivery_date).toLocaleDateString('pt-BR') : 'Não Definido';
  const price = Number(repair.price) || 0;
  
  const renderCopy = (title: string) => `
    <div class="copy-container">
      <div class="header text-center">
        ${logo ? `<img src="${logo}" class="logo" />` : ''}
        <div class="store-name">${storeName}</div>
        <div style="font-size: 14px; font-weight: bold; margin-top: 5px;">ORDEM DE SERVIÇO</div>
        <div style="font-size: 18px; font-weight: bold;">#${(repair.id || '00000000').substring(0, 8)}</div>
        <div style="margin-top: 5px;">Via: ${title}</div>
      </div>

      <div class="section">
        <div class="section-title">DADOS DO CLIENTE</div>
        <div>NOME: ${repair.customer_name || 'N/A'}</div>
        <div>FONE: ${repair.customer_phone || 'N/A'}</div>
      </div>

      <div class="section">
        <div class="section-title">EQUIPAMENTO</div>
        <div style="font-size: 14px; font-weight: bold;">${repair.device_brand || ''} ${repair.device_model || ''}</div>
        <div>S/N: ${repair.serial_number || 'N/A'}</div>
      </div>

      <div class="section">
        <div class="section-title">DEFEITO RELATADO</div>
        <div style="font-style: italic;">${repair.issue_description || 'N/A'}</div>
      </div>

      ${repair.checklist ? `
        <div class="section">
          <div class="section-title">ITENS DEIXADOS</div>
          <div>${repair.checklist}</div>
        </div>
      ` : ''}

      <div class="divider"></div>

      <table class="info-table">
        <tr>
          <td>DATA ENTRADA:</td>
          <td style="text-align: right;">${dateStr}</td>
        </tr>
        <tr>
          <td>PREVISÃO:</td>
          <td style="text-align: right; font-weight: bold;">${deliveryDate}</td>
        </tr>
        <tr style="font-size: 16px; font-weight: bold;">
          <td>VALOR ORÇADO:</td>
          <td style="text-align: right;">R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
      </table>

      <div class="divider"></div>

      <div class="section" style="margin-top: 20px;">
        <div style="border-top: 1px solid #000; margin-top: 30px; text-align: center; font-size: 10px;">
          ASSINATURA DO CLIENTE
        </div>
      </div>

      <div class="footer text-center">
        <div>SDG CONTROL - Gestão Profissional</div>
        <div style="margin-top: 10px; font-size: 9px;">
          Ao assinar, o cliente concorda com os termos de garantia e condições de serviço da loja.
        </div>
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { 
          font-family: 'Courier New', Courier, monospace; 
          width: 58mm; 
          margin: 0; 
          padding: 0;
          font-size: 10px;
          line-height: 1.2;
          color: #000;
        }
        .copy-container {
          padding: 5px;
          page-break-after: always;
          border-bottom: 1px dashed #ccc;
          margin-bottom: 10px;
        }
        .text-center { text-align: center; }
        .header { margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
        .logo { max-width: 35mm; margin-bottom: 5px; }
        .store-name { font-weight: bold; font-size: 14px; text-transform: uppercase; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .section { margin-bottom: 8px; }
        .section-title { font-weight: bold; border-bottom: 1px solid #eee; margin-bottom: 2px; font-size: 9px; }
        .info-table { width: 100%; border-collapse: collapse; }
        .footer { margin-top: 15px; font-size: 9px; }
        @media print {
          @page { margin: 0; }
          body { margin: 0; }
          .copy-container:last-child { border-bottom: none; page-break-after: auto; }
        }
      </style>
    </head>
    <body>
      ${renderCopy('CLIENTE')}
      <div style="height: 40px; border-bottom: 2px dashed #000; margin: 20px 0;"></div>
      ${renderCopy('LABORATÓRIO / APARELHO')}
    </body>
    </html>
  `;
};

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
          width: 58mm; 
          margin: 0; 
          padding: 5px;
          font-size: 10px;
          line-height: 1.2;
        }
        .text-center { text-align: center; }
        .header { margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
        .logo { max-width: 35mm; margin-bottom: 5px; }
        .store-name { font-weight: bold; font-size: 14px; text-transform: uppercase; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; }
        .totals { margin-top: 8px; font-weight: bold; }
        .footer { margin-top: 15px; font-size: 9px; }
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
    </body>
    </html>
  `;
};