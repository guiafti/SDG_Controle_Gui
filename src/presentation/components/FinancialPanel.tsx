import React, { useEffect, useState } from 'react';

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
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [paymentModeActive, setPaymentModeActive] = useState(false);
  const totalFinal = Math.max(0, totalItems - discount);
  const paymentMethods = [
    { key: 'PIX', label: '1 - PIX', icon: 'ph-currency-circle-dollar' },
    { key: 'CARTAO_CREDITO', label: '2 - C. Crédito', icon: 'ph-credit-card' },
    { key: 'CARTAO_DEBITO', label: '3 - C. Débito', icon: 'ph-credit-card' },
    { key: 'DINHEIRO', label: '4 - Dinheiro', icon: 'ph-money' }
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F10') {
        e.preventDefault();
        onFinish(paymentMethod);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paymentMethod, onFinish]);

  return (
    <>
      <div className="w-[320px] flex flex-col gap-4">
        <div className="bg-slate-900 rounded-2xl shadow-lg border border-slate-800 p-6 text-white flex flex-col relative overflow-hidden">
          <div className="absolute -right-6 -top-6 text-slate-800 opacity-30 pointer-events-none">
            <i className="ph ph-currency-circle-dollar text-[120px]"></i>
          </div>
          
          <div className="relative z-10 flex-1">
            <p className="text-brand-400 text-[10px] font-bold tracking-widest uppercase mb-1">Total a Pagar</p>
            <h1 className="text-4xl font-bold text-white font-mono mb-6 tracking-tighter">
              {totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h1>
            
            <div className="space-y-4">
              <div>
                <label className="block text-slate-500 text-[9px] font-bold uppercase mb-1.5 ml-1">
                  Pagamento
                </label>
                <select 
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-sm text-white rounded-xl p-2.5 outline-none font-bold focus:border-brand-500 transition-colors appearance-none"
                >
                  <option value="PIX">PIX</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                  <option value="CARTAO_DEBITO">Cartão de Débito</option>
                  <option value="DINHEIRO">Dinheiro</option>
                </select>
              </div>
              
              <div>
                <label className="block text-slate-500 text-[9px] font-bold uppercase mb-1.5 ml-1">Desconto (R$)</label>
                <input 
                  type="number" 
                  value={discount || ''} 
                  onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none text-right font-mono text-lg font-bold focus:border-brand-500 transition-colors disabled:opacity-50" 
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Subtotal:</span>
                <span className="text-sm font-bold text-slate-300 font-mono">{totalItems.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={() => onFinish(paymentMethod)}
          className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-lg font-bold tracking-wider py-4 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all uppercase"
        >
          <i className="ph ph-check-circle text-2xl"></i>
          Finalizar (F10)
        </button>
      </div>
    </>
  );
};

export default FinancialPanel;