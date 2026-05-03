import React, { useState, useEffect, useRef } from 'react';

const Dashboard: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState({ pending: 0, total: 0 });
  const [stats, setStats] = useState({ totalRevenue: 0, monthlyRevenue: 0 });
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [staleStockItems, setStaleStockItems] = useState<any[]>([]);
  const [alertFilter, setAlertFilter] = useState<'low' | 'stale'>('low');
  const [selectedStore, setSelectedStore] = useState('1');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const status = await window.api.getSyncStatus();
      setSyncStatus(status || { pending: 0, total: 0 });
      
      const s = await window.api.getDashboardStats();
      setStats(s || { totalRevenue: 0, monthlyRevenue: 0 });

      const lowStock = await window.api.getLowStockItems();
      setLowStockItems(lowStock || []);

      const staleStock = await window.api.getStaleStockItems();
      setStaleStockItems(staleStock || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event: any) => {
      const xmlData = event.target.result;
      try {
        const result = await window.api.importXmlProducts(xmlData, selectedStore);
        toast.success(`SUCESSO!\nNovos: ${result.newProducts}\nEstoques: ${result.stockUpdates}`);
        fetchData();
      } catch (error) {
        toast.error('ERRO: Verifique o formato do XML.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadTemplate = async () => {
    try {
      const template = await window.api.downloadProtocolTemplate();
      const blob = new Blob([template], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'protocolo_madrugadao.xml';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (e) {
      toast.error('Falha ao gerar arquivo modelo.');
    }
  };

  const activeItems = alertFilter === 'low' ? lowStockItems : staleStockItems;

  return (
    <section id="view-dashboard" className="view-section active p-4 md:p-6 max-w-7xl mx-auto w-full font-sans space-y-4 animate-in fade-in duration-500">
      
      {/* Upper Grid: XML Import and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Protocolo Guardião (XML Import) - Compact Card */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col justify-between group">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center text-brand-500">
                <i className="ph ph-shield-check text-xl"></i>
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Protocolo Guardião</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Carga de Estoque Massiva</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase ml-1">Unidade de Destino</label>
              <select 
                value={selectedStore} 
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-brand-500 transition-all appearance-none"
              >
                <option value="1">Loja A (Centro)</option>
                <option value="2">Loja B (Avenida)</option>
                <option value="3">Loja C (Shopping)</option>
              </select>
            </div>
          </div>
          
          <input type="file" ref={fileInputRef} onChange={onFileChange} accept=".xml" className="hidden" />

          <div className="mt-6 space-y-2">
            <button 
              onClick={handleImportClick}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-xs hover:bg-black flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
            >
              <i className="ph ph-file-arrow-up text-lg"></i>
              IMPORTAR XML
            </button>
            <button 
              onClick={handleDownloadTemplate}
              className="w-full text-slate-400 py-1 font-bold text-[9px] hover:text-brand-600 transition-colors flex items-center justify-center gap-1.5"
            >
              <i className="ph ph-download-simple"></i>
              BAIXAR MODELO
            </button>
          </div>
        </div>

        {/* Sync and Revenue Stats */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sync Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 text-slate-50 opacity-50">
              <i className="ph ph-cloud-arrow-up text-8xl"></i>
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status de Sincronização</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-800 tracking-tighter">{syncStatus.total - syncStatus.pending}</span>
                <span className="text-slate-300 font-bold text-lg">/ {syncStatus.total}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${syncStatus.pending > 0 ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                  {syncStatus.pending > 0 ? `${syncStatus.pending} registros aguardando nuvem` : 'Base local 100% espelhada'}
                </p>
              </div>
            </div>
          </div>

          {/* Revenue Card */}
          <div className="bg-slate-900 rounded-2xl shadow-lg p-5 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-white/5">
              <i className="ph ph-chart-line-up text-9xl"></i>
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-1">Faturamento Mensal</p>
              <h3 className="text-3xl font-bold text-white tracking-tight font-mono">
                {stats.monthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
              <p className="mt-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                Acumulado Histórico: {stats.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* SEÇÃO DE ALERTAS DE ESTOQUE - Compact & Professional */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="bg-slate-50 p-3 px-6 flex flex-col sm:flex-row justify-between items-center gap-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400">
              <i className={`ph ${alertFilter === 'low' ? 'ph-warning-octagon' : 'ph-clock-counter-clockwise'} text-lg`}></i>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-tight">
                {alertFilter === 'low' ? 'Monitor de Estoque Crítico' : 'Análise de Itens Parados'}
              </h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Inteligência de Inventário</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => setAlertFilter('low')}
              className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${alertFilter === 'low' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Baixo Estoque ({lowStockItems.length})
            </button>
            <button 
              onClick={() => setAlertFilter('stale')}
              className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${alertFilter === 'stale' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Sem Giro ({staleStockItems.length})
            </button>
          </div>
        </div>

        <div className="p-2">
          {activeItems.length === 0 ? (
            <div className="py-16 text-center text-slate-300 font-bold uppercase tracking-widest flex flex-col items-center gap-2">
              <i className="ph ph-check-circle text-4xl opacity-20"></i>
              <span className="text-[10px]">Operação Saudável: Sem Alertas</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-2">
              {activeItems.map((item, idx) => (
                <div key={idx} className="bg-white rounded-xl p-3 border border-slate-100 flex flex-col gap-3 group hover:border-brand-300 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-700 text-[11px] uppercase truncate leading-tight">{item.name}</h4>
                      <span className="text-[8px] font-mono font-bold text-slate-400 block mt-0.5 tracking-tighter">#{item.barcode}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[7px] font-bold text-slate-400 uppercase block leading-none mb-1">
                        {alertFilter === 'low' ? 'Mínimo' : 'Tolerância'}
                      </span>
                      <span className="text-xs font-bold text-slate-500 italic bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        {alertFilter === 'low' ? (item.min_1 || 2) : `${item.stale_1 || 30}d`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-50">
                    {[1, 2, 3].map(storeIdx => {
                      const stock = item[`stock_${storeIdx}`];
                      const min = item[`min_${storeIdx}`] || 2;
                      const isLow = alertFilter === 'low' && stock <= min;
                      const storeName = storeIdx === 1 ? 'Centro' : storeIdx === 2 ? 'Avenida' : 'Shopping';
                      
                      return (
                        <div key={storeIdx} className={`p-1.5 rounded-lg border text-center relative overflow-hidden transition-colors ${isLow ? 'bg-red-50/50 border-red-100' : 'bg-slate-50/30 border-slate-100'}`}>
                          <span className="text-[7px] font-bold text-slate-400 uppercase block mb-0.5 truncate">{storeName}</span>
                          <span className={`text-xs font-bold ${isLow ? 'text-red-600' : 'text-slate-600'}`}>{stock}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Dashboard;