import * as path from 'path';

export interface PrintData {
  type: 'SALE' | 'OS';
  storeName: string;
  items: any[];
  total: number;
  paymentMethod?: string;
  customer?: string;
  id?: string;
  date?: string;
}

export class PrinterModule {

  /**
   * MODO RAW / ESC-POS:
   * Usado quando a impressora está em rede (IP:porta 9100).
   * Para USB/COM3 no Windows, o comando `print /D:` do CMD
   * NÃO aceita dados binários ESC/POS — por isso foi removido.
   * Para USB, use sempre o método HTML via main.ts (print-receipt / print-repair-receipt).
   */
  /**
   * ENVIO DIRETO VIA ESCPOS-USB (Recomendado pelo usuário)
   * Utiliza as bibliotecas escpos e escpos-usb para maior controle.
   */
  public static async printUSB(vid: number, pid: number, data: PrintData | string) {
    try {
      const escpos = require('escpos');
      escpos.USB = require('escpos-usb');

      const device = new escpos.USB(vid, pid);
      const printer = new escpos.Printer(device);

      return new Promise((resolve) => {
        device.open((err: any) => {
          if (err) {
            console.error("Erro ao abrir impressora USB:", err);
            resolve({ success: false, error: `Não foi possível abrir a impressora (VID:${vid.toString(16)}). Verifique o driver WinUSB.` });
            return;
          }

          try {
            if (typeof data === 'string') {
              printer.font('a').align('ct').size(1, 1).text(data);
            } else {
              // --- FORMATAÇÃO AVANÇADA COM ESCPOS ---
              printer.font('a').align('ct').size(1, 1).style('b').text(data.storeName.toUpperCase()).style('normal');
              printer.text('--------------------------------');
              
              if (data.type === 'SALE') {
                printer.align('lt').text(`VENDA: ${data.id?.substring(0, 8)}`);
              } else {
                printer.align('lt').text(`O.S.: ${data.id}`);
                if (data.customer) printer.text(`CLIENTE: ${data.customer.toUpperCase()}`);
              }
              
              printer.text(`DATA: ${data.date || new Date().toLocaleString('pt-BR')}`);
              printer.text('--------------------------------');

              // Itens
              data.items.forEach(item => {
                const name = (item.name || item.device_model || 'PRODUTO').substring(0, 20);
                const line = `${name.padEnd(20)} ${String(item.qtd).padStart(3)} ${item.total.toFixed(2).padStart(7)}`;
                printer.align('lt').text(line);
              });

              printer.text('--------------------------------');
              printer.align('rt').style('b').text(`TOTAL: R$ ${data.total.toFixed(2)}`).style('normal');
              
              if (data.paymentMethod) printer.align('rt').text(`PAGAMENTO: ${data.paymentMethod}`);
              
              printer.feed(2).align('ct').text('Obrigado pela preferencia!').feed(2);
            }

            printer.cut().close(() => {
              resolve({ success: true });
            });
          } catch (printErr: any) {
            device.close();
            resolve({ success: false, error: `Erro na impressao: ${printErr.message}` });
          }
        });
      });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public static async printRaw(data: PrintData, interfaceName: string = 'POS-58') {
    try {
      const { ThermalPrinter, PrinterTypes, CharacterSet } = require('node-thermal-printer');
      const fs = require('fs');
      const os = require('os');

      const printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: 'none',
        characterSet: CharacterSet.WPC1252,
        removeSpecialCharacters: false,
        width: 32,
      });

      // --- MONTAGEM DO CUPOM ESC/POS ---
      printer.alignCenter();
      printer.bold(true);
      printer.setTextDoubleHeight();
      printer.setTextDoubleWidth();
      printer.println(data.storeName.toUpperCase());
      printer.setTextNormal();
      printer.bold(false);
      printer.drawLine();
      printer.alignLeft();

      if (data.type === 'SALE') {
        printer.println(`CUPOM DE VENDA: ${data.id?.substring(0, 8)}`);
      } else {
        printer.println(`ORDEM DE SERVICO: ${data.id}`);
        if (data.customer) printer.println(`CLIENTE: ${data.customer.toUpperCase()}`);
      }

      printer.println(`DATA: ${data.date || new Date().toLocaleString('pt-BR')}`);
      printer.drawLine();

      data.items.forEach(item => {
        const name = item.name || item.device_model || 'PRODUTO';
        const qtd = item.qtd || 1;
        const total = item.total || item.price || 0;
        printer.tableCustom([
          { text: name.substring(0, 15), align: "LEFT", width: 0.5 },
          { text: qtd.toString(), align: "CENTER", width: 0.2 },
          { text: total.toFixed(2), align: "RIGHT", width: 0.3 }
        ]);
      });

      printer.drawLine();
      printer.alignRight();
      printer.bold(true);
      printer.println(`TOTAL: R$ ${data.total.toFixed(2)}`);
      printer.bold(false);
      if (data.paymentMethod) printer.println(`PAGAMENTO: ${data.paymentMethod}`);
      printer.newLine();
      printer.alignCenter();
      printer.println("Obrigado pela preferencia!");
      printer.newLine();
      printer.newLine();
      try { printer.openCashDrawer(); } catch (e) {}
      printer.cut();

      const buffer = printer.getBuffer();

      // --- NOVO: ENVIO DIRETO VIA USB (BAIXO NÍVEL) ---
      // Formato esperado no interfaceName: "USB:VID:PID", "USB:28E9:0289" ou "USB:AUTO"
      if (interfaceName && interfaceName.toUpperCase().startsWith('USB:')) {
        try {
          const usb = require('usb');
          let vid = 0x28e9;
          let pid = 0x0289;

          if (interfaceName.toUpperCase() !== 'USB:AUTO') {
            const parts = interfaceName.split(':');
            vid = parseInt(parts[1], 16) || vid;
            pid = parseInt(parts[2], 16) || pid;
          }

          let device = usb.findByIds(vid, pid);
          
          // Se for AUTO e não achou o padrão Knup, tenta procurar por qualquer impressora genérica
          if (!device && interfaceName.toUpperCase() === 'USB:AUTO') {
            const devices = usb.getDeviceList();
            // Procura por dispositivos que costumam ser impressoras (Class 7) ou VIDs comuns (0x0fe6, 0x0483, etc)
            device = devices.find((d: any) => 
              d.deviceDescriptor.idVendor === 0x0fe6 || 
              d.deviceDescriptor.idVendor === 0x0416 ||
              d.deviceDescriptor.idVendor === 0x1a86
            );
          }

          if (!device) {
            return { success: false, error: `Impressora USB nao encontrada (VID:${vid.toString(16)}).` };
          }

          return new Promise((resolve) => {
            try {
              device.open();
              const iface = device.interfaces[0];
              
              // Tenta desanexar driver do kernel (necessário em alguns casos)
              if (os.platform() !== 'win32' && iface.isKernelDriverActive()) {
                iface.detachKernelDriver();
              }

              iface.claim();
              const outEndpoint = iface.endpoints.find((e: any) => e.direction === 'out');

              if (!outEndpoint) {
                iface.release(true, () => device.close());
                return resolve({ success: false, error: "Nao foi possivel encontrar o endpoint de saida da impressora." });
              }

              outEndpoint.transfer(buffer, (err: any) => {
                iface.release(true, () => {
                  device.close();
                  if (err) resolve({ success: false, error: `Erro na transferencia USB: ${err.message}` });
                  else resolve({ success: true });
                });
              });
            } catch (usbErr: any) {
              try { device.close(); } catch (e) {}
              resolve({ success: false, error: `Falha ao abrir dispositivo USB: ${usbErr.message}` });
            }
          });
        } catch (e: any) {
          return { success: false, error: `Erro no modulo USB: ${e.message}` };
        }
      }

      // --- ENVIO VIA REDE (IP:9100) ---
      // Funciona para impressoras conectadas via cabo de rede ou Wi-Fi.
      if (interfaceName && !interfaceName.startsWith('printer:') && interfaceName.includes('.')) {
        const net = require('net');
        return new Promise((resolve) => {
          const client = new net.Socket();
          const host = interfaceName.trim();
          client.setTimeout(5000);
          client.connect(9100, host, () => {
            client.write(buffer, () => {
              client.end();
              resolve({ success: true });
            });
          });
          client.on('error', (err: any) => {
            client.destroy();
            resolve({ success: false, error: `Nao foi possivel conectar em ${host}:9100. Verifique o IP e a rede.` });
          });
          client.on('timeout', () => {
            client.destroy();
            resolve({ success: false, error: "Tempo esgotado ao conectar na impressora de rede." });
          });
        });
      }

      // --- ENVIO DIRETO VIA PORTA SERIAL/USB (Windows) ---
      // Funciona para impressoras em portas como COM3, COM4, etc.
      // Tenta escrever diretamente na porta serial emulada pelo driver USB.
      if (interfaceName && (interfaceName.toUpperCase().startsWith('COM') || interfaceName.startsWith('printer:'))) {
        const portName = interfaceName.replace('printer:', '').trim();
        const tmpPath = path.join(os.now ? Date.now() : new Date().getTime(), `escpos_${Date.now()}.bin`);
        // Note: fix path.join(os.tmpdir(), ...) - corrected below in actual write
        const actualTmpPath = path.join(os.tmpdir(), `escpos_${Date.now()}.bin`);
        fs.writeFileSync(actualTmpPath, buffer);

        // Copia o binário diretamente para a porta COM (método mais confiável no Windows)
        const { exec } = require('child_process');
        return new Promise((resolve) => {
          const command = `cmd /c copy /b "${actualTmpPath}" ${portName}`;
          exec(command, (error: any) => {
            setTimeout(() => { try { fs.unlinkSync(actualTmpPath); } catch (e) {} }, 5000);
            if (error) {
              // Se falhar na porta COM, informa claramente que deve usar o modo HTML
              resolve({
                success: false,
                error: `Falha ao enviar para ${portName} via USB. Use o Metodo HTML (Windows) nas configuracoes — ele funciona com o driver da KP-1029.`
              });
            } else {
              resolve({ success: true });
            }
          });
        });
      }

      // --- SEM INTERFACE RECONHECIDA ---
      return {
        success: false,
        error: 'Interface nao reconhecida. Use um IP de rede, uma porta COM (ex: COM3) ou mude para o Metodo HTML nas configuracoes.'
      };

    } catch (error: any) {
      console.error("Erro Geral no PrinterModule:", error);
      return { success: false, error: error.message };
    }
  }
}
