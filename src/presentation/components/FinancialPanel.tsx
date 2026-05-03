import React, { useEffect, useState } from 'react';

interface FinancialPanelProps {
  totalItems: number;
  discount: number;
  onDiscountChange: (value: number) => void;
  onFinish: (paymentMethod: string, customerId?: string) => void;
}

const FinancialPanel: React.FC<FinancialPanelProps> = ({ 
  totalItems, 
  discount, 
  onDiscountChange, 
  onFinish 
}) => {
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  const totalFinal = Math.max(0, totalItems - discount);

  useEffect(() => {
    window.api.getCustomers().then(setCustomers).catch(() => {});
  }, []);

  const filteredCustomers = customerSearch.trim() === '' ? [] : customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
    c.phone.includes(customerSearch)
  ).slice(0, 5);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F10') {
        e.preventDefault();
        onFinish(paymentMethod, selectedCustomer?.id);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paymentMethod, onFinish, selectedCustomer]);

  return (
    <>
      <div className="w-[320px] flex flex-col gap-4">
        {/* Identificador de Cliente */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 relative">
          <label className="block text-slate-400 text-[9px] font-black uppercase tracking-widest mb-2 ml-1">Identificar Cliente</label>
          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-brand-50 p-2.5 rounded-xl border border-brand-100">
               <div className="min-w-0">
                  <p className="text-xs font-bold text-brand-700 uppercase truncate">{selectedCustomer.name}</p>
                  <p className="text-[9px] text-brand-500 font-medium">{selectedCustomer.phone}</p>
               </div>
               <button onClick={() => setSelectedCustomer(null)} className="text-brand-400 hover:text-brand-600"><i className="ph ph-x-circle text-xl"></i></button>
            </div>
          ) : (
            <div className="relative">
              <i className="ph ph-user-focus absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"></i>
              <input 
                type="text" 
                placeholder="NOME OU WHATSAPP..." 
                value={customerSearch}
                onChange={(e) => { setCustomerSearch(e.target.value); setIsCustomerDropdownOpen(true); }}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-brand-500 transition-all uppercase"
              />
              {isCustomerDropdownOpen && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
                  {filteredCustomers.map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setIsCustomerDropdownOpen(false); }}
                      className="p-3 hover:bg-brand-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center group"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-700 uppercase truncate group-hover:text-brand-600">{c.name}</p>
                        <p className="text-[8px] text-slate-400 font-medium">{c.phone}</p>
                      </div>
                      <i className="ph ph-plus-circle text-slate-300 group-hover:text-brand-500 text-lg"></i>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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
          onClick={() => onFinish(paymentMethod, selectedCustomer?.id)}
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