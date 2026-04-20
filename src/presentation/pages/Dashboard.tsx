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
        alert(`SUCESSO!\nNovos: ${result.newProducts}\nEstoques: ${result.stockUpdates}`);
        fetchData();
      } catch (error) {
        alert('ERRO: Verifique o formato do XML.');
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
      alert('Falha ao gerar arquivo modelo.');
    }
  };

  const activeItems = alertFilter === 'low' ? lowStockItems : staleStockItems;

  return (
    <section id="view-dashboard" className="view-section active p-8 max-w-7xl mx-auto w-full font-sans">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Card Protocolo XML */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs font-black text-brand-600 uppercase tracking-widest mb-4">Protocolo Guardião</p>
            <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase">Loja para Carga</label>
            <select 
              value={selectedStore} 
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm outline-none focus:border-brand-500 mb-6 font-bold"
            >
              <option value="1">Loja A (Centro)</option>
              <option value="2">Loja B (Avenida)</option>
              <option value="3">Loja C (Shopping)</option>
            </select>
          </div>
          
          <input type="file" ref={fileInputRef} onChange={onFileChange} accept=".xml" className="hidden" />

          <div className="space-y-3">
            <button 
              onClick={handleImportClick}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs hover:bg-black flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
            >
              <i className="ph ph-file-arrow-up text-2xl"></i>
              IMPORTAR XML
            </button>
            <button 
              onClick={handleDownloadTemplate}
              className="w-full text-slate-400 py-2 font-bold text-[10px] hover:text-brand-600 transition-colors flex items-center justify-center gap-2"
            >
              <i className="ph ph-download-simple"></i>
              BAIXAR MODELO DO PROTOCOLO
            </button>
          </div>
        </div>

        {/* Status Cloud */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Sincronização</p>
          <h3 className="text-5xl font-black text-slate-800 mb-2">
            {syncStatus.total - syncStatus.pending} <span className="text-slate-200 text-2xl">/ {syncStatus.total}</span>
          </h3>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${syncStatus.pending > 0 ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`}></div>
            <p className="text-xs font-bold text-slate-500">
              {syncStatus.pending > 0 ? 'Vendas pendentes' : 'Sistema sincronizado'}
            </p>
          </div>
        </div>

        {/* Faturamento */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Faturamento Mensal</p>
          <h3 className="text-4xl font-black text-slate-800 mb-2">
            {stats.monthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h3>
          <p className="text-xs font-bold text-slate-400">Total Acumulado: {stats.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
      </div>
      
      {/* SEÇÃO DE ALERTAS DE ESTOQUE */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="bg-brand-600 p-6 px-10 flex justify-between items-center">
          <div className="flex items-center gap-4 text-white">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">
              <i className={`ph ${alertFilter === 'low' ? 'ph-warning-octagon' : 'ph-clock-counter-clockwise'}`}></i>
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter italic">
                {alertFilter === 'low' ? 'Central de Alertas' : 'Estoque Parado'}
              </h3>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                {alertFilter === 'low' ? 'Produtos com estoque abaixo do limite' : 'Produtos sem venda há mais de 30 dias'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-black/10 p-1.5 rounded-2xl">
            <button 
              onClick={() => setAlertFilter('low')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${alertFilter === 'low' ? 'bg-white text-brand-600 shadow-lg' : 'text-white/60 hover:text-white'}`}
            >
              BAIXO ESTOQUE ({lowStockItems.length})
            </button>
            <button 
              onClick={() => setAlertFilter('stale')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${alertFilter === 'stale' ? 'bg-white text-brand-600 shadow-lg' : 'text-white/60 hover:text-white'}`}
            >
              ESTOQUE PARADO ({staleStockItems.length})
            </button>
          </div>
        </div>

        <div className="p-4">
          {activeItems.length === 0 ? (
            <div className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest flex flex-col items-center gap-4">
              <i className="ph ph-check-circle text-6xl opacity-20"></i>
              Tudo em ordem! Nada para mostrar aqui.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {activeItems.map((item, idx) => (
                <div key={idx} className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col gap-4 group hover:border-brand-200 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-800 text-sm uppercase truncate">{item.name}</h4>
                      <span className="text-[10px] font-mono font-bold text-slate-400 block mt-1 uppercase">Código: #{item.barcode}</span>
                    </div>
                    {alertFilter === 'low' && (
                      <div className="text-right">
                        <span className="text-[9px] font-black text-slate-400 uppercase block">Estoque Mínimo</span>
                        <span className="text-lg font-black text-slate-400 italic">{item.min_1 || 2}</span>
                      </div>
                    )}
                    {alertFilter === 'stale' && (
                      <div className="text-right">
                        <span className="text-[9px] font-black text-slate-400 uppercase block">Tolerância</span>
                        <span className="text-lg font-black text-slate-400 italic">{item.stale_1 || 30}d</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-200/50">
                    <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center relative overflow-hidden">
                      {alertFilter === 'low' && item.stock_1 <= (item.min_1 || 2) && <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>}
                      {alertFilter === 'stale' && <div className="absolute top-0 left-0 w-full h-1 bg-brand-400"></div>}
                      <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Loja A</span>
                      <span className={`text-sm font-black ${alertFilter === 'low' && item.stock_1 <= (item.min_1 || 2) ? 'text-red-600' : 'text-slate-600'}`}>{item.stock_1}</span>
                      {alertFilter === 'stale' && <span className="text-[7px] block text-slate-300 font-bold">{item.stale_1}d</span>}
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center relative overflow-hidden">
                      {alertFilter === 'low' && item.stock_2 <= (item.min_2 || 2) && <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>}
                      {alertFilter === 'stale' && <div className="absolute top-0 left-0 w-full h-1 bg-brand-400"></div>}
                      <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Loja B</span>
                      <span className={`text-sm font-black ${alertFilter === 'low' && item.stock_2 <= (item.min_2 || 2) ? 'text-red-600' : 'text-slate-600'}`}>{item.stock_2}</span>
                      {alertFilter === 'stale' && <span className="text-[7px] block text-slate-300 font-bold">{item.stale_2}d</span>}
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center relative overflow-hidden">
                      {alertFilter === 'low' && item.stock_3 <= (item.min_3 || 2) && <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>}
                      {alertFilter === 'stale' && <div className="absolute top-0 left-0 w-full h-1 bg-brand-400"></div>}
                      <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Loja C</span>
                      <span className={`text-sm font-black ${alertFilter === 'low' && item.stock_3 <= (item.min_3 || 2) ? 'text-red-600' : 'text-slate-600'}`}>{item.stock_3}</span>
                      {alertFilter === 'stale' && <span className="text-[7px] block text-slate-300 font-bold">{item.stale_3}d</span>}
                    </div>
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