import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const FinancialControl: React.FC = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalInflow: 0, totalOutflow: 0, netProfit: 0 });
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('DINHEIRO');
  const [storeId, setStoreId] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [exps, cats, summ, strs] = await Promise.all([
        window.api.getExpenses(),
        window.api.getExpenseCategories(),
        window.api.getFinancialSummary(),
        window.api.getStores()
      ]);
      setExpenses(exps || []);
      setCategories(cats || []);
      setSummary(summ || { totalInflow: 0, totalOutflow: 0, netProfit: 0 });
      setStores(strs || []);
      if (strs && strs.length > 0 && !storeId) setStoreId(strs[0].id);
      if (cats && cats.length > 0 && !categoryId) setCategoryId(cats[0].id);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar dados financeiros');
    }
    setLoading(false);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !value || !categoryId || !storeId) {
      toast.error('Preencha todos os campos!');
      return;
    }

    const loadingId = toast.loading('Salvando despesa...');
    try {
      const result = await window.api.saveExpense({
        description,
        value: Number(value),
        category_id: categoryId,
        date,
        payment_method: paymentMethod,
        store_id: storeId
      });

      if (result.success) {
        toast.success('Despesa registrada!', { id: loadingId });
        setIsModalOpen(false);
        resetForm();
        fetchData();
      }
    } catch (error) {
      toast.error('Erro ao salvar despesa', { id: loadingId });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta despesa?')) return;
    try {
      await window.api.deleteExpense(id);
      toast.success('Despesa removida');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const resetForm = () => {
    setDescription('');
    setValue('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <main className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
        
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">Controle Financeiro</h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Fluxo de Caixa e Gestão de Despesas</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-brand-700 shadow-xl shadow-brand-500/30 transition-all uppercase text-xs tracking-widest"
          >
            <i className="ph ph-plus-circle text-2xl"></i> Lançar Despesa
          </button>
        </div>

        {/* Dashboard Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 text-emerald-50 opacity-50 group-hover:scale-110 transition-transform">
              <i className="ph ph-trend-up text-9xl"></i>
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Entradas (Vendas)</p>
            <h3 className="text-4xl font-black text-emerald-600 font-mono">
              {summary.totalInflow.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <div className="mt-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Receita Bruta Acumulada</span>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 text-red-50 opacity-50 group-hover:scale-110 transition-transform">
              <i className="ph ph-trend-down text-9xl"></i>
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Saídas (Despesas/Comissões)</p>
            <h3 className="text-4xl font-black text-red-500 font-mono">
              {summary.totalOutflow.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <div className="mt-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Custo Operacional Total</span>
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[32px] shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 text-white/5 group-hover:scale-110 transition-transform">
              <i className="ph ph-bank text-9xl"></i>
            </div>
            <p className="text-xs font-black text-brand-400 uppercase tracking-widest mb-2">Lucro Líquido</p>
            <h3 className={`text-4xl font-black font-mono ${summary.netProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
              {summary.netProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <div className="mt-4 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${summary.netProfit >= 0 ? 'bg-brand-500' : 'bg-red-500'}`}></span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Resultado do Período</span>
            </div>
          </div>
        </div>

        {/* Expenses List */}
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">Histórico de Despesas</h3>
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors">Exportar PDF</button>
              <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors">Planilha Excel</button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Data</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Descrição</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Categoria</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Loja</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Pagamento</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">Valor</th>
                  <th className="px-8 py-5 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={7} className="px-8 py-20 text-center text-slate-300 font-bold uppercase animate-pulse">Carregando movimentações...</td></tr>
                ) : expenses.length === 0 ? (
                  <tr><td colSpan={7} className="px-8 py-20 text-center text-slate-300 font-bold uppercase italic">Nenhuma despesa registrada.</td></tr>
                ) : expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-5 text-sm font-bold text-slate-500">{new Date(exp.date).toLocaleDateString()}</td>
                    <td className="px-8 py-5 text-sm font-black text-slate-800 uppercase">{exp.description}</td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase">
                        {exp.category_name}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-xs font-bold text-slate-400 uppercase">
                      {stores.find(s => s.id === exp.store_id)?.name || '...'}
                    </td>
                    <td className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">{exp.payment_method}</td>
                    <td className="px-8 py-5 text-right font-mono font-black text-red-500">
                      - {exp.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button 
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="w-10 h-10 rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all flex items-center justify-center"
                      >
                        <i className="ph ph-trash text-xl"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL LANÇAMENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 bg-brand-600 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter italic">Lançar Nova Saída</h2>
                <p className="text-brand-100 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Registro de Custo Operacional</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 rounded-full hover:bg-black/10 flex items-center justify-center text-white transition-colors">
                <i className="ph ph-x text-3xl"></i>
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-10 space-y-6 bg-slate-50">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição do Gasto</label>
                  <input 
                    type="text" required value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Ex: Aluguel do Mês"
                    className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-700 font-bold outline-none focus:border-brand-500 transition-all shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Valor (R$)</label>
                    <input 
                      type="number" step="0.01" required value={value} onChange={e => setValue(e.target.value)}
                      placeholder="0.00"
                      className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl text-red-500 font-mono font-black text-xl outline-none focus:border-brand-500 transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Data</label>
                    <input 
                      type="date" required value={date} onChange={e => setDate(e.target.value)}
                      className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-700 font-bold outline-none focus:border-brand-500 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Categoria</label>
                    <select 
                      value={categoryId} onChange={e => setCategoryId(e.target.value)}
                      className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-700 font-bold outline-none focus:border-brand-500 transition-all shadow-sm appearance-none"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Unidade / Loja</label>
                    <select 
                      value={storeId} onChange={e => setStoreId(e.target.value)}
                      className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-700 font-bold outline-none focus:border-brand-500 transition-all shadow-sm appearance-none"
                    >
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Meio de Pagamento</label>
                  <select 
                    value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-700 font-bold outline-none focus:border-brand-500 transition-all shadow-sm appearance-none"
                  >
                    <option value="DINHEIRO">DINHEIRO</option>
                    <option value="PIX">PIX</option>
                    <option value="BOLETO">BOLETO</option>
                    <option value="CARTAO_CREDITO">CARTÃO DE CRÉDITO</option>
                    <option value="CARTAO_DEBITO">CARTÃO DE DÉBITO</option>
                    <option value="TRANSFERENCIA">TRANSFERÊNCIA</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full py-5 bg-brand-600 text-white font-black rounded-3xl hover:bg-brand-700 shadow-xl shadow-brand-500/30 active:scale-95 transition-all uppercase tracking-widest"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialControl;