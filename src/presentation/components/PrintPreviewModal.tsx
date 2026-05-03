import React from 'react';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  data: {
    repair: any;
    storeName: string;
    logo?: string;
  };
}

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ isOpen, onClose, onConfirm, data }) => {
  if (!isOpen) return null;

  const { repair, storeName, logo } = data;
  const dateStr = repair.created_at ? new Date(repair.created_at).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
  const deliveryDate = repair.delivery_date ? new Date(repair.delivery_date).toLocaleDateString('pt-BR') : 'Não Definido';
  const price = Number(repair.price) || 0;

  const ReceiptCopy = ({ title }: { title: string }) => (
    <div className="bg-[#fffffa] text-slate-900 p-6 shadow-inner border border-slate-200 w-full max-w-[80mm] mx-auto font-mono text-[11px] leading-tight space-y-3">
      <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
        {logo && <img src={logo} className="max-w-[40mm] mx-auto mb-2 opacity-80" alt="Logo" />}
        <div className="font-bold text-[14px] uppercase">{storeName}</div>
        <div className="font-bold text-[12px] mt-1">ORDEM DE SERVIÇO</div>
        <div className="font-bold text-[16px]">#{repair.id.substring(0, 8)}</div>
        <div className="text-[10px] mt-1 opacity-70">Via: {title}</div>
      </div>

      <div className="space-y-1">
        <div className="font-bold border-b border-slate-200 text-[9px] text-slate-500 uppercase">Dados do Cliente</div>
        <div><span className="font-bold">NOME:</span> {repair.customer_name || 'N/A'}</div>
        <div><span className="font-bold">FONE:</span> {repair.customer_phone || 'N/A'}</div>
      </div>

      <div className="space-y-1">
        <div className="font-bold border-b border-slate-200 text-[9px] text-slate-500 uppercase">Equipamento</div>
        <div className="font-bold text-[12px]">{repair.device_brand} {repair.device_model}</div>
        <div><span className="font-bold">S/N:</span> {repair.serial_number || 'N/A'}</div>
      </div>

      <div className="space-y-1">
        <div className="font-bold border-b border-slate-200 text-[9px] text-slate-500 uppercase">Defeito Relatado</div>
        <div className="italic break-words">"{repair.issue_description || 'N/A'}"</div>
      </div>

      {repair.checklist && (
        <div className="space-y-1">
          <div className="font-bold border-b border-slate-200 text-[9px] text-slate-500 uppercase">Itens Deixados</div>
          <div className="break-words">{repair.checklist}</div>
        </div>
      )}

      <div className="border-t border-dashed border-slate-400 my-3"></div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <span>DATA ENTRADA:</span>
          <span className="font-bold">{dateStr}</span>
        </div>
        <div className="flex justify-between">
          <span>PREVISÃO:</span>
          <span className="font-bold">{deliveryDate}</span>
        </div>
        <div className="flex justify-between text-[14px] font-bold mt-2">
          <span>VALOR ORÇADO:</span>
          <span>R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-slate-400 my-3"></div>

      <div className="pt-8 text-center">
        <div className="border-t border-slate-900 w-full mb-1 mx-auto"></div>
        <div className="text-[9px] uppercase font-bold">Assinatura do Cliente</div>
      </div>

      <div className="text-center text-[9px] opacity-60 mt-4">
        <div>SDG CONTROL - Gestão Profissional</div>
        <div className="mt-1 leading-tight">Ao assinar, o cliente concorda com os termos de garantia e condições de serviço da loja.</div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <i className="ph ph-printer text-2xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Visualização de Impressão</h2>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Confirme os dados antes de imprimir</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
            <i className="ph ph-x text-2xl"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-200/50 custom-scrollbar flex flex-col md:flex-row gap-8 items-start justify-center">
          <div className="space-y-2 w-full md:w-auto">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Via do Cliente</p>
            <ReceiptCopy title="CLIENTE" />
          </div>

          <div className="hidden md:flex flex-col items-center self-stretch justify-center">
            <div className="w-px h-full border-l-2 border-dashed border-slate-300"></div>
            <i className="ph ph-scissors text-slate-300 text-xl my-4"></i>
            <div className="w-px h-full border-l-2 border-dashed border-slate-300"></div>
          </div>

          <div className="space-y-2 w-full md:w-auto">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Via da Loja / Lab</p>
            <ReceiptCopy title="LABORATÓRIO" />
          </div>
        </div>

        <div className="p-6 bg-white border-t border-slate-100 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all uppercase text-[10px] tracking-wider"
          >
            Ajustar Dados
          </button>
          <button 
            onClick={onConfirm}
            className="flex-[2] py-4 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 shadow-xl shadow-brand-500/20 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-3"
          >
            <i className="ph ph-printer text-2xl"></i>
            Confirmar e Imprimir
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintPreviewModal;
