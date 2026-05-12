import { useCallback } from 'react';
import toast from 'react-hot-toast';

export const usePrinter = () => {
  const getPrinterSettings = async () => {
    try {
      const settings = await window.api.getSettings();
      return {
        interface: settings.find((s: any) => s.key === 'printer_interface')?.value || 'printer:POS-58',
        type: settings.find((s: any) => s.key === 'printer_type')?.value || 'escpos'
      };
    } catch (e) {
      return { interface: 'printer:POS-58', type: 'escpos' };
    }
  };

  const printSale = useCallback(async (sale: any, storeName: string, logo?: string) => {
    try {
      const settings = await getPrinterSettings();

      if (settings.type === 'escpos') {
        const rawData = {
          type: 'SALE' as const,
          storeName,
          items: sale.items.map((item: any) => ({
            name: item.nome,
            qtd: item.qtd,
            total: item.preco * item.qtd
          })),
          total: sale.total,
          paymentMethod: sale.payment_method,
          id: sale.id,
          date: new Date(sale.created_at || new Date()).toLocaleString('pt-BR')
        };

        // NOVO: Roteamento para printUSB se for interface USB:VID:PID
        if (settings.interface.toUpperCase().startsWith('USB:')) {
          const parts = settings.interface.split(':');
          const vid = parseInt(parts[1], 16) || 0x28E9;
          const pid = parseInt(parts[2], 16) || 0x0289;
          const res = await window.api.printUSB(vid, pid, rawData);
          if (res.success) {
            toast.success("Cupom USB impresso!");
            return;
          }
        }

        const result = await window.api.printRaw(rawData, settings.interface);
        if (result.success) {
          toast.success("Cupom impresso!");
          return;
        }
        console.warn("Falha no ESC/POS, tentando fallback HTML...", result.error);
      }

      // Fallback ou Tipo HTML
      await window.api.printReceipt({ 
        sale, 
        storeName, 
        logo, 
        deviceName: settings.interface.replace('printer:', '') 
      });
      toast.success("Impressão enviada!");
    } catch (error) {
      console.error("Erro ao imprimir venda:", error);
      toast.error("Erro ao processar impressão.");
    }
  }, []);

  const printRepair = useCallback(async (repair: any, storeName: string, logo?: string) => {
    try {
      const settings = await getPrinterSettings();

      if (settings.type === 'escpos') {
        const rawData = {
          type: 'OS' as const,
          storeName,
          items: [{
            name: `${repair.device_brand} ${repair.device_model}`,
            qtd: 1,
            total: repair.price
          }],
          total: repair.price,
          customer: repair.customer_name,
          id: repair.id?.substring(0, 8),
          date: new Date(repair.created_at || new Date()).toLocaleString('pt-BR')
        };

        // NOVO: Roteamento para printUSB se for interface USB:VID:PID
        if (settings.interface.toUpperCase().startsWith('USB:')) {
          const parts = settings.interface.split(':');
          const vid = parseInt(parts[1], 16) || 0x28E9;
          const pid = parseInt(parts[2], 16) || 0x0289;
          const res = await window.api.printUSB(vid, pid, rawData);
          if (res.success) {
            toast.success("O.S. USB impressa!");
            return;
          }
        }

        const result = await window.api.printRaw(rawData, settings.interface);
        if (result.success) {
          toast.success("OS impressa!");
          return;
        }
        console.warn("Falha no ESC/POS, tentando fallback HTML...", result.error);
      }

      await window.api.printRepairReceipt({ repair, storeName, logo });
      toast.success("OS enviada para impressão!");
    } catch (error) {
      console.error("Erro ao imprimir OS:", error);
      toast.error("Erro ao processar impressão.");
    }
  }, []);

  return { printSale, printRepair };
};
