import React from 'react';

interface FinancialPanelProps {
  totalItems: number;
  discount: number;
  onDiscountChange: (value: number) => void;
  onFinish: (paymentMethod: string) => void;
}

const FinancialPanel: React.FC<FinancialPanelProps> = ({ 
  totalItems, 
  discount, 
  onDiscountChange, 
  onFinish 
}) => {
  const [paymentMethod, setPaymentMethod] = React.useState('PIX');
  const totalFinal = Math.max(0, totalItems - discount);

  return (
    <div className="w-[400px] flex flex-col gap-6">
      <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-8 text-white flex flex-col relative overflow-hidden">
        <div className="absolute -right-10 -top-10 text-slate-800 opacity-50">
          <i className="ph ph-currency-circle-dollar text-[150px]"></i>
        </div>
        
        <div className="relative z-10 flex-1">
          <p className="text-brand-400 text-sm font-bold tracking-widest uppercase mb-1">Total a Pagar</p>
          <h1 className="text-6xl font-black text-white font-mono mb-8 tracking-tighter">
            {totalFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h1>
          
          <div className="space-y-5">
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Forma de Pagamento</label>
              <select 
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-800 border-2 border-slate-700 text-xl text-white rounded-xl p-4 outline-none font-bold focus:border-brand-500 transition-colors"
              >
                <option value="PIX">PIX</option>
                <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                <option value="CARTAO_DEBITO">Cartão de Débito</option>
                <option value="DINHEIRO">Dinheiro</option>
              </select>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Desconto (R$)</label>
                <input 
                  type="number" 
                  value={discount || ''} 
                  onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-slate-800 border-2 border-slate-700 text-white rounded-xl p-4 outline-none text-right font-mono text-xl font-bold focus:border-brand-500 transition-colors" 
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <div className="flex justify-between text-sm text-slate-400 font-bold uppercase">
                <span>Subtotal:</span>
                <span>{totalItems.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={() => onFinish(paymentMethod)}
        className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-2xl font-black tracking-wider py-8 rounded-2xl shadow-[0_10px_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-4 transition-all"
      >
        <i className="ph ph-check-circle text-4xl"></i>
        FINALIZAR VENDA
      </button>
    </div>
  );
};

export default FinancialPanel;