import React, { useState, useEffect } from 'react';

const Dashboard: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState({ pending: 0, total: 0 });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await window.api.getSyncStatus();
        setSyncStatus(status);
      } catch (error) {
        console.error('Erro ao buscar status de sincronização:', error);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleImport = async () => {
    const mockData = [
      { barcode: '999', name: 'Produto Importado Teste', price: 99.90, stock: 10 },
      { barcode: '888', name: 'Outro Produto Protocolo', price: 150.00, stock: 5 }
    ];

    try {
      const count = await window.api.importProducts(mockData);
      alert(`${count} produtos importados com sucesso pelo Protocolo Guardião!`);
    } catch (error) {
      alert('Erro na importação: Verifique os dados.');
    }
  };

  return (
    <section id="view-dashboard" className="view-section active p-8 max-w-7xl mx-auto w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-1">Vendas Totais (Mês)</p>
              <h3 className="text-3xl font-black text-slate-800">R$ 145.200</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl">
              <i className="ph ph-trend-up"></i>
            </div>
          </div>
        </div>

        {/* Status de Sincronização Cloud */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-1">Sincronização Cloud</p>
              <h3 className="text-3xl font-black text-slate-800">
                {syncStatus.total - syncStatus.pending} / {syncStatus.total}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {syncStatus.pending > 0 ? `${syncStatus.pending} vendas aguardando conexão` : 'Tudo sincronizado'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${syncStatus.pending > 0 ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
              <i className={`ph ${syncStatus.pending > 0 ? 'ph-cloud-arrow-up' : 'ph-cloud-check'}`}></i>
            </div>
          </div>
        </div>

        {/* Botão de Importação (Protocolo Guardião) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 cursor-pointer hover:bg-slate-50 transition-colors" onClick={handleImport}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-1">Carga de Estoque</p>
              <h3 className="text-xl font-bold text-brand-600">Importar via Protocolo</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-2xl">
              <i className="ph ph-upload-simple"></i>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-12 rounded-xl border border-slate-100 shadow-sm text-center">
        <i className="ph ph-chart-bar text-6xl text-slate-300 mb-4"></i>
        <h3 className="text-xl font-bold text-slate-700">Área Administrativa</h3>
        <p className="text-slate-500 mt-2 max-w-md mx-auto">Esta área é dedicada à gestão. Para realizar vendas com leitor de código de barras, clique no botão "Abrir PDV (Caixa)" no menu lateral.</p>
      </div>
    </section>
  );
};

export default Dashboard;