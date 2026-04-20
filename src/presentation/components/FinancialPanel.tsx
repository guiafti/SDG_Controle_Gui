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
    { key: 'CARTAO_CREDITO', label: '2 - Cartão de Crédito', icon: 'ph-credit-card' },
    { key: 'CARTAO_DEBITO', label: '3 - Cartão de Débito', icon: 'ph-credit-card' },
    { key: 'DINHEIRO', label: '4 - Dinheiro', icon: 'ph-money' }
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F10') {
        e.preventDefault();
        setPaymentModeActive(true);
        return;
      }
      
      if (paymentModeActive) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault();
          const method = paymentMethods[parseInt(e.key) - 1].key;
          setPaymentMethod(method);
          onFinish(method);
          setPaymentModeActive(false);
        } else if (e.key === 'Escape') {
          setPaymentModeActive(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paymentModeActive, onFinish]);

  const handleModalSelection = (method: string) => {
    setPaymentMethod(method);
    onFinish(method);
    setPaymentModeActive(false);
  };

  return (
    <>
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
                <label className="block text-slate-400 text-xs font-bold uppercase mb-2">
                  Forma de Pagamento
                </label>
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
                    disabled={paymentModeActive}
                    className="w-full bg-slate-800 border-2 border-slate-700 text-white rounded-xl p-4 outline-none text-right font-mono text-xl font-bold focus:border-brand-500 transition-colors disabled:opacity-50" 
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
          onClick={() => setPaymentModeActive(true)}
          className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-2xl font-black tracking-wider py-8 rounded-2xl shadow-[0_10px_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-4 transition-all"
        >
          <i className="ph ph-check-circle text-4xl"></i>
          FECHAR VENDA (F10)
        </button>
      </div>

      {paymentModeActive && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl overflow-hidden transform animate-in fade-in zoom-in duration-200">
            <div className="bg-brand-600 p-8 text-white text-center">
              <h3 className="text-3xl font-black uppercase tracking-tighter italic">Selecione o Pagamento</h3>
              <p className="text-brand-100 text-sm font-bold uppercase tracking-widest mt-2 opacity-80">
                Pressione o número correspondente ou clique na opção
              </p>
            </div>
            
            <div className="p-10 bg-slate-50">
              <div className="text-center mb-10">
                <p className="text-slate-400 font-bold uppercase tracking-widest mb-2">Total a cobrar</p>
                <h1 className="text-7xl font-black text-slate-900 font-mono">
                  {totalFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h1>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {paymentMethods.map((method) => (
                  <button
                    key={method.key}
                    onClick={() => handleModalSelection(method.key)}
                    className="bg-white border-2 border-slate-200 hover:border-brand-500 hover:shadow-lg hover:shadow-brand-500/20 p-8 rounded-3xl flex items-center gap-6 transition-all group active:scale-95 text-left"
                  >
                    <div className="w-16 h-16 bg-slate-100 group-hover:bg-brand-100 text-slate-500 group-hover:text-brand-600 rounded-2xl flex items-center justify-center text-3xl transition-colors">
                      <i className={`ph ${method.icon}`}></i>
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-slate-800">{method.label}</h4>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-10 text-center">
                <button 
                  onClick={() => setPaymentModeActive(false)}
                  className="px-8 py-4 bg-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-300 transition-colors uppercase tracking-widest text-sm"
                >
                  Cancelar (ESC)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FinancialPanel;