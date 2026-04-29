import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import AdminHeader from '../components/AdminHeader';
import RepairOrderModal from '../components/RepairOrderModal';

const Repairs: React.FC = () => {
  const [repairs, setRepairs] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'local'>('local');
  const [searchTerm, setSearchTerm] = useState('');

  const currentStoreId = localStorage.getItem('selectedStoreId') || '1';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [rData, sData] = await Promise.all([
      window.api.getRepairs(),
      window.api.getStores(true)
    ]);
    setRepairs(rData || []);
    setStores(sData || []);
    setLoading(false);
  };

  const handleUpdateStatus = async (id: string, newStatus: string, newLocationId: string) => {
    const loadingId = toast.loading('Atualizando status...');
    try {
      const result = await window.api.updateRepairStatus({ id, status: newStatus, current_store_id: newLocationId });
      if (result.success) {
        toast.success(`Status atualizado para: ${newStatus}`, { id: loadingId });
        fetchData();
      } else {
        toast.error('Falha ao atualizar status', { id: loadingId });
      }
    } catch (error) {
      toast.error('Erro de comunicação', { id: loadingId });
    }
  };

  const filteredRepairs = repairs.filter(r => {
    const matchesSearch = 
      r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.device_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.includes(searchTerm);
    
    if (filter === 'local') {
      return matchesSearch && r.current_store_id === currentStoreId;
    }
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Recebido': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Em Trânsito (Ida)': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'No Laboratório': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Pronto - Em Trânsito (Volta)': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'Pronto para Retirada': return 'bg-green-100 text-green-700 border-green-200';
      case 'Entregue': return 'bg-slate-100 text-slate-500 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStoreName = (id: string) => stores.find(s => s.id === id)?.name || 'Desconhecida';

  return (
    <div className="flex-1 flex flex-col h-screen bg-slate-50 overflow-hidden">
      <AdminHeader title="Assistência Técnica" />
      
      <main className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
        {/* Top Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            <button 
              onClick={() => setFilter('local')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-widest ${filter === 'local' ? 'bg-brand-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Nesta Loja
            </button>
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-widest ${filter === 'all' ? 'bg-brand-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Rede Total
            </button>
          </div>

          <div className="flex-1 max-w-md w-full relative">
            <i className="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl"></i>
            <input 
              type="text" 
              placeholder="Buscar por cliente, aparelho ou código..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-brand-500 shadow-sm transition-all"
            />
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-600 shadow-lg shadow-brand-500/20 transition-all uppercase text-sm tracking-widest"
          >
            <i className="ph ph-plus-circle text-xl"></i>
            Nova Ordem de Serviço
          </button>
        </div>

        {/* List Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">
            Carregando Reparos...
          </div>
        ) : filteredRepairs.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center text-4xl mb-4">
              <i className="ph ph-wrench"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-800">Nenhum reparo encontrado</h3>
            <p className="text-slate-500 max-w-xs mt-2">Clique no botão "Nova Ordem de Serviço" para cadastrar uma manutenção.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredRepairs.map(r => (
              <div key={r.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex flex-col sm:flex-row h-full">
                  {/* Image/Photo */}
                  <div className="sm:w-48 h-48 sm:h-auto bg-slate-100 relative">
                    {r.photo_url ? (
                      <img 
                        src={`local-img://${r.photo_url}`} 
                        className="w-full h-full object-cover" 
                        alt="Aparelho"
                        onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/200x200?text=Sem+Foto')}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                        <i className="ph ph-image text-4xl mb-1"></i>
                        <span className="text-[10px] font-black uppercase tracking-tighter">Sem Foto</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/50 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest">
                      ID: {r.id.substring(0, 8)}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-6 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 leading-tight">{r.device_brand} {r.device_model}</h3>
                        <p className="text-sm font-bold text-slate-500">{r.customer_name}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </div>

                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2 text-slate-500">
                        <i className="ph ph-map-pin-line text-lg"></i>
                        <span className="text-xs font-bold uppercase">Local Atual: <span className="text-slate-800">{getStoreName(r.current_store_id)}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <i className="ph ph-info text-lg"></i>
                        <p className="text-xs leading-relaxed line-clamp-2 italic">"{r.issue_description || 'Sem descrição do defeito.'}"</p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                      <div className="text-brand-600">
                        <span className="text-[10px] font-black uppercase block tracking-tighter opacity-60">Valor Previsto</span>
                        <span className="text-xl font-mono font-black">R$ {Number(r.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>

                      {/* Dynamic Action Button */}
                      <div className="flex gap-2">
                        {r.status === 'Recebido' && r.current_store_id === currentStoreId && (
                          <button 
                            onClick={() => handleUpdateStatus(r.id, 'Em Trânsito (Ida)', r.maintenance_store_id)}
                            className="bg-orange-500 text-white p-3 rounded-xl hover:bg-orange-600 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                            title="Despachar para o Laboratório"
                          >
                            <i className="ph ph-paper-plane-tilt text-lg"></i>
                            Enviar
                          </button>
                        )}

                        {r.status === 'Em Trânsito (Ida)' && r.maintenance_store_id === currentStoreId && (
                          <button 
                            onClick={() => handleUpdateStatus(r.id, 'No Laboratório', currentStoreId)}
                            className="bg-purple-500 text-white p-3 rounded-xl hover:bg-purple-600 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                          >
                            <i className="ph ph-check-square text-lg"></i>
                            Receber no Lab
                          </button>
                        )}

                        {r.status === 'No Laboratório' && r.maintenance_store_id === currentStoreId && (
                          <button 
                            onClick={() => handleUpdateStatus(r.id, 'Pronto - Em Trânsito (Volta)', r.entry_store_id)}
                            className="bg-cyan-500 text-white p-3 rounded-xl hover:bg-cyan-600 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                          >
                            <i className="ph ph-bicycle text-lg"></i>
                            Concluir e Enviar
                          </button>
                        )}

                        {r.status === 'Pronto - Em Trânsito (Volta)' && r.entry_store_id === currentStoreId && (
                          <button 
                            onClick={() => handleUpdateStatus(r.id, 'Pronto para Retirada', currentStoreId)}
                            className="bg-green-500 text-white p-3 rounded-xl hover:bg-green-600 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                          >
                            <i className="ph ph-storefront text-lg"></i>
                            Receber na Loja
                          </button>
                        )}

                        {r.status === 'Pronto para Retirada' && r.entry_store_id === currentStoreId && (
                          <button 
                            onClick={() => handleUpdateStatus(r.id, 'Entregue', currentStoreId)}
                            className="bg-slate-800 text-white p-3 rounded-xl hover:bg-slate-900 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-400"
                          >
                            <i className="ph ph-handshake text-lg"></i>
                            Entregar ao Cliente
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <RepairOrderModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchData} 
      />
    </div>
  );
};

export default Repairs;