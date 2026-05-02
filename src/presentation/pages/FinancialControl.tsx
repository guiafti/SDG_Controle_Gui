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
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Top Intelligence Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 group">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Receita Bruta</span>
            <div className="text-2xl font-black text-slate-800 font-mono">
              {summary.totalInflow.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-full"></div>
                </div>
                <span className="text-[9px] font-black text-emerald-500">100% IN</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Custo de Mercadoria</span>
            <div className="text-2xl font-black text-slate-800 font-mono text-orange-600">
              {summary.estimatedCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500" style={{ width: `${(summary.estimatedCost / summary.totalInflow) * 100}%` }}></div>
                </div>
                <span className="text-[9px] font-black text-orange-500">CMV</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Margem de Contribuição</span>
            <div className="text-2xl font-black text-slate-800 font-mono">
              {grossMargin}%
            </div>
            <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${grossMargin}%` }}></div>
                </div>
                <span className="text-[9px] font-black text-blue-500">MÉDIA</span>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-[32px] shadow-2xl relative overflow-hidden">
            <i className="ph ph-lightning absolute -right-2 -bottom-2 text-6xl text-white/5 rotate-12"></i>
            <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest block mb-1">Lucro Líquido Real</span>
            <div className={`text-2xl font-black font-mono ${summary.netProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
              {summary.netProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="mt-3 text-[9px] font-black text-slate-500 uppercase">Resultado Operacional Final</div>
          </div>
        </div>

        {/* Charts and Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Trend Chart (SVG Based) */}
            <div className="lg:col-span-2 bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-lg font-black uppercase tracking-tighter italic">Tendência de Faturamento</h3>
                    <span className="px-3 py-1 bg-brand-50 text-brand-600 rounded-lg text-[10px] font-black uppercase">Últimos 6 Meses</span>
                </div>
                
                <div className="h-64 flex items-end justify-between gap-4 px-4 relative">
                    {/* Linhas de Grade */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5 py-2">
                        {[1,2,3,4].map(i => <div key={i} className="w-full h-px bg-slate-900"></div>)}
                    </div>
                    
                    {summary.trends.map((t: any, i: number) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                            <div className="relative w-full flex flex-col items-center justify-end h-full">
                                <div 
                                    className="w-12 bg-brand-500 rounded-t-xl group-hover:bg-brand-600 transition-all relative"
                                    style={{ height: `${(t.inflow / maxTrend) * 100}%` }}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-black py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        R$ {t.inflow.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase">{t.month}</span>
                        </div>
                    ))}
                    {summary.trends.length === 0 && <div className="w-full h-full flex items-center justify-center text-slate-300 font-black uppercase text-xs">Dados insuficientes para gráfico</div>}
                </div>
            </div>

            {/* Expenses by Category */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                <h3 className="text-lg font-black uppercase tracking-tighter italic mb-6">Maiores Gastos</h3>
                <div className="space-y-6">
                    {categories.slice(0, 5).map(cat => {
                        const catTotal = expenses.filter(e => e.category_id === cat.id).reduce((acc, curr) => acc + curr.value, 0);
                        const perc = summary.totalOutflow > 0 ? (catTotal / summary.totalOutflow * 100).toFixed(0) : 0;
                        return (
                            <div key={cat.id} className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase">
                                    <span className="text-slate-500">{cat.name}</span>
                                    <span className="text-slate-800">R$ {catTotal.toLocaleString()}</span>
                                </div>
                                <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                                    <div className="h-full bg-slate-900 transition-all duration-1000" style={{ width: `${perc}%` }}></div>
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
      <main className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <i className="ph ph-bank text-2xl"></i>
                </div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">Inteligência Financeira</h1>
            </div>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] ml-14">Planejamento Estratégico e Análise de Margens</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 mr-4">
                <button onClick={() => setActiveTab('dashboard')} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Visão Geral</button>
                <button onClick={() => setActiveTab('history')} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'history' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Histórico</button>
                <button onClick={() => setActiveTab('planning')} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'planning' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Planejamento</button>
            </div>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-brand-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-700 shadow-xl shadow-brand-500/30 transition-all active:scale-95"
            >
                Lançar Despesa
            </button>
          </div>
        </div>

        {activeTab === 'dashboard' && renderDashboard()}

        {activeTab === 'history' && (
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-400 border-b border-slate-200">
                        <tr>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Data</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Descrição</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Categoria</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Pagamento</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {expenses.map(exp => (
                            <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-8 py-5 text-sm font-bold text-slate-500">{new Date(exp.date).toLocaleDateString()}</td>
                                <td className="px-8 py-5 text-sm font-black text-slate-800 uppercase">{exp.description}</td>
                                <td className="px-8 py-5">
                                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase">{exp.category_name}</span>
                                </td>
                                <td className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">{exp.payment_method}</td>
                                <td className="px-8 py-5 text-right font-mono font-black text-red-500">- {exp.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {activeTab === 'planning' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in zoom-in-95 duration-500">
                <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm space-y-6">
                    <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-500">
                        <i className="ph ph-target text-3xl"></i>
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter italic">Orçamentos de Categoria</h3>
                    <p className="text-slate-500 font-medium">Defina limites mensais para cada categoria de gasto e acompanhe a saúde financeira da sua operação.</p>
                    
                    <div className="space-y-4 pt-4">
                        {categories.slice(0, 4).map(cat => (
                            <div key={cat.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex justify-between items-center group hover:bg-white hover:shadow-xl transition-all">
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">{cat.name}</span>
                                    <span className="text-lg font-black text-slate-800 font-mono">R$ 0,00</span>
                                </div>
                                <button className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-slate-400 hover:text-brand-500 transition-all">
                                    <i className="ph ph-plus-bold"></i>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-900 p-10 rounded-[48px] shadow-2xl relative overflow-hidden flex flex-col justify-center">
                    <i className="ph ph-trend-up absolute -right-10 -bottom-10 text-[200px] text-white/5 rotate-12"></i>
                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic mb-4">Meta de Lucratividade</h3>
                    <p className="text-slate-400 font-medium mb-8">Sua margem atual é de <span className="text-brand-400 font-black">24%</span>. O sistema sugere um ajuste de preços em 5% dos itens de baixo giro para atingir a meta de 30%.</p>
                    <button className="w-full py-5 bg-white text-slate-900 rounded-[28px] font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition-transform">Ver Sugestões de Ajuste</button>
                </div>
            </div>
        )}
      </main>

      {/* Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter italic">Lançamento Financeiro</h2>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Gestão de Saídas Operacionais</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition-colors">
                <i className="ph ph-x text-3xl"></i>
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-10 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição</label>
                  <input type="text" required value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Compra de Cabos USB" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-700 font-bold outline-none focus:border-brand-500 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Valor (R$)</label>
                    <input type="number" step="0.01" required value={value} onChange={e => setValue(e.target.value)} placeholder="0.00" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-red-500 font-mono font-black text-xl outline-none focus:border-brand-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Categoria</label>
                    <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-700 font-bold outline-none focus:border-brand-500 transition-all appearance-none">
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl hover:bg-black shadow-xl transition-all uppercase tracking-widest">Confirmar Lançamento</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialControl;