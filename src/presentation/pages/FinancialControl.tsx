import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const FinancialControl: React.FC = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ totalInflow: 0, totalOutflow: 0, netProfit: 0, estimatedCost: 0, trends: [] });
  const [budgets, setBudgets] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'planning'>('dashboard');
  
  // Form states
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('DINHEIRO');
  const [storeId, setStoreId] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [exps, cats, summ, strs, buds] = await Promise.all([
        window.api.getExpenses(),
        window.api.getExpenseCategories(),
        window.api.getFinancialSummary(),
        window.api.getStores(),
        window.api.getBudgets()
      ]);
      setExpenses(exps || []);
      setCategories(cats || []);
      setSummary(summ || { totalInflow: 0, totalOutflow: 0, netProfit: 0, estimatedCost: 0, trends: [] });
      setStores(strs || []);
      setBudgets(buds || []);
      if (strs && strs.length > 0 && !storeId) setStoreId(strs[0].id);
      if (cats && cats.length > 0 && !categoryId) setCategoryId(cats[0].id);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar inteligência financeira');
    }
    setLoading(false);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingId = toast.loading('Registrando saída...');
    try {
      const result = await window.api.saveExpense({ description, value: Number(value), category_id: categoryId, date, payment_method: paymentMethod, store_id: storeId });
      if (result.success) {
        toast.success('Lançamento efetuado!', { id: loadingId });
        setIsModalOpen(false);
        resetForm();
        fetchData();
      }
    } catch (error) { toast.error('Erro no lançamento', { id: loadingId }); }
  };

  const resetForm = () => {
    setDescription('');
    setValue('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const renderDashboard = () => {
    const grossMargin = summary.totalInflow > 0 ? ((summary.totalInflow - summary.estimatedCost) / summary.totalInflow * 100).toFixed(1) : 0;
    const maxTrend = Math.max(...summary.trends.map((t: any) => t.inflow), 1);

    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        {/* Compact Intelligence Cards */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          <div className="flex-none bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500"><i className="ph ph-trend-up text-lg"></i></div>
            <div>
              <div className="text-sm font-bold text-slate-800 font-mono">
                {summary.totalInflow.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Receita Bruta</div>
            </div>
          </div>

          <div className="flex-none bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500"><i className="ph ph-shopping-cart text-lg"></i></div>
            <div>
              <div className="text-sm font-bold text-slate-800 font-mono">
                {summary.estimatedCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Custo Mercadoria</div>
            </div>
          </div>

          <div className="flex-none bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500"><i className="ph ph-chart-line-up text-lg"></i></div>
            <div>
              <div className="text-sm font-bold text-slate-800 font-mono">{grossMargin}%</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Margem Média</div>
            </div>
          </div>

          <div className="flex-none bg-slate-900 px-5 py-3 rounded-xl shadow-md flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-brand-400"><i className="ph ph-lightning text-lg"></i></div>
            <div>
              <div className={`text-sm font-bold font-mono ${summary.netProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
                {summary.netProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lucro Líquido</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Compact Trend Chart */}
            <div className="lg:col-span-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tendência de Faturamento</h3>
                    <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded text-[9px] font-bold uppercase">6 Meses</span>
                </div>
                
                <div className="h-40 flex items-end justify-between gap-2 px-2 relative">
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5 py-1">
                        {[1,2,3].map(i => <div key={i} className="w-full h-px bg-slate-900"></div>)}
                    </div>
                    
                    {summary.trends.map((t: any, i: number) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                            <div className="relative w-full flex flex-col items-center justify-end h-full">
                                <div 
                                    className="w-full max-w-[32px] bg-brand-500/80 rounded-t-md group-hover:bg-brand-500 transition-all"
                                    style={{ height: `${(t.inflow / maxTrend) * 100}%` }}
                                ></div>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{t.month.substring(0,3)}</span>
                        </div>
                    ))}
                    {summary.trends.length === 0 && <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold uppercase text-[10px]">Sem dados para o gráfico</div>}
                </div>
            </div>

            {/* Compact Top Expenses */}
            <div className="lg:col-span-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Maiores Gastos</h3>
                <div className="space-y-3 flex-1">
                    {categories.slice(0, 4).map(cat => {
                        const catTotal = expenses.filter(e => e.category_id === cat.id).reduce((acc, curr) => acc + curr.value, 0);
                        const perc = summary.totalOutflow > 0 ? (catTotal / summary.totalOutflow * 100).toFixed(0) : 0;
                        return (
                            <div key={cat.id} className="space-y-1">
                                <div className="flex justify-between text-[9px] font-bold uppercase">
                                    <span className="text-slate-500 truncate mr-2">{cat.name}</span>
                                    <span className="text-slate-800">R$ {catTotal.toLocaleString()}</span>
                                </div>
                                <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                                    <div className="h-full bg-slate-400 group-hover:bg-slate-900 transition-all duration-1000" style={{ width: `${perc}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <main className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Fluxo Financeiro</h1>
            <p className="text-slate-500 font-medium text-xs mt-0.5">Gestão de Saídas e Análise de Rentabilidade</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Painel</button>
                <button onClick={() => setActiveTab('history')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'history' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Histórico</button>
                <button onClick={() => setActiveTab('planning')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'planning' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Metas</button>
            </div>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-brand-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-brand-600 shadow-md shadow-brand-500/20 transition-all"
            >
                <i className="ph ph-plus-circle text-xl"></i> Nova Saída
            </button>
          </div>
        </div>

        {activeTab === 'dashboard' && renderDashboard()}

        {activeTab === 'history' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descrição / Operador</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo / Categoria</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pagamento</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {summary.ledger.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-300 font-bold uppercase text-xs">Nenhum registro no fluxo de caixa</td></tr>
                            ) : summary.ledger.map((item: any) => {
                                const isEntry = item.type === 'ENTRADA (VENDA)';
                                return (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3.5 text-xs font-medium text-slate-500">{new Date(item.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-3.5 text-xs font-bold text-slate-800 uppercase">{item.description}</td>
                                        <td className="px-6 py-3.5">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ${isEntry ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-[9px] font-bold text-slate-400 uppercase">{item.payment_method}</td>
                                        <td className={`px-6 py-3.5 text-right font-mono font-bold text-xs ${isEntry ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {isEntry ? '+' : '-'}{item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'planning' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in zoom-in-95 duration-300">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-500">
                            <i className="ph ph-target text-xl"></i>
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase">Orçamentos por Categoria</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2">
                        {categories.slice(0, 4).map(cat => (
                            <div key={cat.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center group hover:bg-white hover:border-brand-200 transition-all cursor-pointer">
                                <div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">{cat.name}</span>
                                    <span className="text-xs font-bold text-slate-800 font-mono">R$ 0,00</span>
                                </div>
                                <div className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 group-hover:text-brand-500 transition-all">
                                    <i className="ph ph-plus-bold text-xs"></i>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-center">
                    <i className="ph ph-trend-up absolute -right-4 -bottom-4 text-[120px] text-white/5 rotate-12"></i>
                    <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-2">Meta de Lucratividade</h3>
                    <p className="text-slate-400 text-xs leading-relaxed mb-6">Sua margem atual é de <span className="text-brand-400 font-bold">24%</span>. O sistema sugere um ajuste estratégico para atingir a meta de <span className="text-emerald-400 font-bold">30%</span>.</p>
                    <button className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all">Analisar Estratégia</button>
                </div>
            </div>
        )}
      </main>

      {/* Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
                  <i className="ph ph-bank text-xl"></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 tracking-tight">Novo Lançamento</h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Gestão Financeira</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
                <i className="ph ph-x text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descrição do Gasto</label>
                  <input type="text" required value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Internet, Aluguel, Peças..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor (R$)</label>
                    <input type="number" step="0.01" required value={value} onChange={e => setValue(e.target.value)} placeholder="0.00" className="w-full p-2.5 bg-brand-50 border border-brand-100 rounded-xl text-red-500 font-mono font-bold text-base outline-none focus:border-brand-500 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                    <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 transition-all appearance-none">
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="pt-2">
                    <button type="submit" className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black shadow-lg transition-all uppercase text-[10px] tracking-widest">Confirmar Lançamento</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialControl;