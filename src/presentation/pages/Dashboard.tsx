import React, { useState, useEffect, useRef } from 'react';

const Dashboard: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState({ pending: 0, total: 0 });
  const [selectedStore, setSelectedStore] = useState('1');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStatus = async () => {
    try {
      const status = await window.api.getSyncStatus();
      setSyncStatus(status || { pending: 0, total: 0 });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
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
        fetchStatus();
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

  return (
    <section id="view-dashboard" className="view-section active p-8 max-w-7xl mx-auto w-full">
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
          <h3 className="text-4xl font-black text-slate-800 mb-2">R$ 145.200</h3>
          <p className="text-xs font-bold text-emerald-500 flex items-center gap-1">
            <i className="ph ph-trend-up"></i> +12% Crescimento
          </p>
        </div>
      </div>
      
      <div className="bg-white p-20 rounded-[40px] border border-slate-100 shadow-sm text-center">
        <div className="w-20 h-20 bg-brand-50 text-brand-600 rounded-3xl flex items-center justify-center mx-auto mb-8 text-4xl rotate-3">
          <i className="ph ph-shield-check"></i>
        </div>
        <h3 className="text-3xl font-black text-slate-800 tracking-tight">Protocolo Multiloja Ativo</h3>
        <p className="text-slate-400 mt-4 max-w-sm mx-auto font-medium leading-relaxed">
          O sistema está configurado para receber cargas de estoque e processar vendas de forma independente para as 3 unidades.
        </p>
      </div>
    </section>
  );
};

export default Dashboard;