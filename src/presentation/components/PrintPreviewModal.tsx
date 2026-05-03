import React from 'react';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  data: {
    repair?: any;
    sale?: any;
    storeName: string;
    logo?: string;
  };
}

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ isOpen, onClose, onConfirm, data }) => {
  if (!isOpen) return null;

  const { repair, sale, storeName, logo } = data;
  const isSale = !!sale;
  const entity = isSale ? sale : repair;
  
  const dateStr = entity.created_at ? new Date(entity.created_at).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
  const price = Number(isSale ? entity.total : entity.price) || 0;

  const ReceiptCopy = ({ title }: { title: string }) => (
    <div className="bg-[#fffffa] text-slate-900 p-6 shadow-inner border border-slate-200 w-full max-w-[80mm] mx-auto font-mono text-[11px] leading-tight space-y-3">
      <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
        {logo && <img src={logo} className="max-w-[30mm] mx-auto mb-2 opacity-80" alt="Logo" />}
        <div className="font-bold text-[13px] uppercase">{storeName}</div>
        <div className="font-bold text-[11px] mt-1">{isSale ? 'COMPROVANTE DE VENDA' : 'ORDEM DE SERVIÇO'}</div>
        <div className="font-bold text-[15px]">#{entity.id.toString().substring(0, 8).toUpperCase()}</div>
        <div className="text-[9px] mt-1 opacity-70">Via: {title}</div>
      </div>

      <div className="space-y-1">
        <div className="font-bold border-b border-slate-200 text-[8px] text-slate-500 uppercase">{isSale ? 'Vendedor' : 'Cliente'}</div>
        <div>{isSale ? entity.vendedor : entity.customer_name}</div>
        {!isSale && <div><span className="font-bold">FONE:</span> {entity.customer_phone || 'N/A'}</div>}
      </div>

      {isSale ? (
        <div className="space-y-1">
          <div className="font-bold border-b border-slate-200 text-[8px] text-slate-500 uppercase">Produtos</div>
          {entity.items?.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between gap-2">
              <span className="truncate flex-1">{item.qtd}x {item.nome}</span>
              <span className="shrink-0">R${(item.preco * item.qtd).toFixed(2)}</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <div className="font-bold border-b border-slate-200 text-[8px] text-slate-500 uppercase">Equipamento</div>
            <div className="font-bold text-[11px]">{entity.device_brand} {entity.device_model}</div>
            <div><span className="font-bold">S/N:</span> {entity.serial_number || 'N/A'}</div>
          </div>
          <div className="space-y-1">
            <div className="font-bold border-b border-slate-200 text-[8px] text-slate-500 uppercase">Defeito Relatado</div>
            <div className="italic break-words text-[10px]">"{entity.issue_description || 'N/A'}"</div>
          </div>
        </>
      )}

      <div className="border-t border-dashed border-slate-400 my-2"></div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <span>DATA:</span>
          <span className="font-bold">{dateStr}</span>
        </div>
        {isSale ? (
          <>
            {entity.discount > 0 && (
              <div className="flex justify-between text-red-500">
                <span>DESCONTO:</span>
                <span>-R$ {Number(entity.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>PAGAMENTO:</span>
              <span className="font-bold">{entity.payment_method}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between">
            <span>PREVISÃO:</span>
            <span className="font-bold">{entity.delivery_date ? new Date(entity.delivery_date).toLocaleDateString('pt-BR') : 'N/A'}</span>
          </div>
        )}
        <div className="flex justify-between text-[13px] font-bold mt-2 border-t border-slate-100 pt-1">
          <span>TOTAL:</span>
          <span>R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {!isSale && (
        <div className="pt-6 text-center">
          <div className="border-t border-slate-900 w-full mb-1 mx-auto"></div>
          <div className="text-[8px] uppercase font-bold">Assinatura do Cliente</div>
        </div>
      )}

      <div className="text-center text-[8px] opacity-60 mt-4 leading-tight">
        <div>SDG CONTROL - Gestão Profissional</div>
        {isSale ? (
          <div>Obrigado pela preferência!</div>
        ) : (
          <div>O cliente concorda com os termos de garantia da loja.</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <i className="ph ph-printer text-xl"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Comprovante Digital</h2>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider italic">Visualize antes de imprimir</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
            <i className="ph ph-x text-xl"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-200/50 custom-scrollbar flex flex-col md:flex-row gap-6 items-start justify-center">
          <div className="space-y-2 w-full md:w-auto">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Via do Cliente</p>
            <ReceiptCopy title="VIA DO CLIENTE" />
          </div>

          <div className="hidden md:flex flex-col items-center self-stretch justify-center">
            <div className="w-px h-full border-l-2 border-dashed border-slate-300"></div>
            <i className="ph ph-scissors text-slate-300 text-lg my-3"></i>
            <div className="w-px h-full border-l-2 border-dashed border-slate-300"></div>
          </div>

          <div className="space-y-2 w-full md:w-auto">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Via Administrativa</p>
            <ReceiptCopy title="VIA DA LOJA" />
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all uppercase text-[9px] tracking-wider"
          >
            Fechar Sem Imprimir
          </button>
          <button 
            onClick={onConfirm}
            className="flex-[2] py-3 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 shadow-xl shadow-brand-500/20 transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
          >
            <i className="ph ph-printer text-xl"></i>
            Confirmar e Imprimir
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintPreviewModal;