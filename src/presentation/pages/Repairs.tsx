import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import RepairOrderModal from '../components/RepairOrderModal';

const WORKFLOW_STEPS = [
  'Na Loja (Aguardando Envio)',
  'Em Trânsito (Ida)',
  'Chegou no Laboratório',
  'Em Manutenção',
  'Manutenção Concluída',
  'Em Trânsito (Volta)',
  'Disponível para Retirada',
  'Entregue'
];

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
    const loadingId = toast.loading('Atualizando fluxo de produção...');
    try {
      const result = await window.api.updateRepairStatus({ id, status: newStatus, current_store_id: newLocationId });
      if (result.success) {
        toast.success(`Movimentado para: ${newStatus}`, { id: loadingId });
        fetchData();
      } else {
        toast.error('Falha ao atualizar status', { id: loadingId });
      }
    } catch (error) {
      toast.error('Erro de comunicação', { id: loadingId });
    }
  };

  const handleTogglePayment = async (id: string, currentPayment: string) => {
    const newStatus = currentPayment === 'paid' ? 'pending' : 'paid';
    const loadingId = toast.loading('Atualizando financeiro...');
    try {
      const result = await window.api.updateRepairPayment({ id, payment_status: newStatus });
      if (result.success) {
        toast.success(newStatus === 'paid' ? 'Marcado como PAGO' : 'Marcado como PENDENTE', { id: loadingId });
        fetchData();
      } else {
        toast.error('Falha ao atualizar pagamento', { id: loadingId });
      }
    } catch (error) {
      toast.error('Erro de rede', { id: loadingId });
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

  const getStatusIndex = (status: string) => WORKFLOW_STEPS.indexOf(status);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Na Loja (Aguardando Envio)': return { color: 'bg-slate-100 text-slate-700', icon: 'ph-package' };
      case 'Em Trânsito (Ida)': return { color: 'bg-orange-100 text-orange-700', icon: 'ph-truck' };
      case 'Chegou no Laboratório': return { color: 'bg-indigo-100 text-indigo-700', icon: 'ph-buildings' };
      case 'Em Manutenção': return { color: 'bg-purple-100 text-purple-700', icon: 'ph-wrench' };
      case 'Manutenção Concluída': return { color: 'bg-emerald-100 text-emerald-700', icon: 'ph-check-circle' };
      case 'Em Trânsito (Volta)': return { color: 'bg-blue-100 text-blue-700', icon: 'ph-bicycle' };
      case 'Disponível para Retirada': return { color: 'bg-yellow-100 text-yellow-700', icon: 'ph-bell-ringing' };
      case 'Entregue': return { color: 'bg-slate-800 text-white', icon: 'ph-handshake' };
      default: return { color: 'bg-slate-100 text-slate-700', icon: 'ph-info' };
    }
  };

  const getStoreName = (id: string) => stores.find(s => s.id === id)?.name || '...';

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* HEADER DINAMICO REMOVIDO PARA EVITAR DUPLICIDADE COM O APP.TSX */}
      
      <main className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
        {/* Top Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
            <button 
              onClick={() => setFilter('local')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${filter === 'local' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Minha Loja
            </button>
            <button 
              onClick={() => setFilter('all')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${filter === 'all' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Toda Rede
            </button>
          </div>

          <div className="flex-1 max-w-xl w-full relative">
            <i className="ph ph-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-2xl"></i>
            <input 
              type="text" 
              placeholder="Buscar cliente, modelo ou código da OS..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border-2 border-transparent focus:border-brand-500 rounded-2xl py-4 pl-14 pr-6 outline-none shadow-sm transition-all text-slate-700 font-medium"
            />
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-500 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-brand-600 shadow-xl shadow-brand-500/30 transition-all uppercase text-sm tracking-tighter"
          >
            <i className="ph ph-plus-circle text-2xl"></i>
            Nova Ordem
          </button>
        </div>

        {/* List Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 font-bold uppercase tracking-widest text-xs">
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            Sincronizando Ordens...
          </div>
        ) : filteredRepairs.length === 0 ? (
          <div className="bg-white border-4 border-dashed border-slate-200 rounded-[40px] p-20 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center text-5xl mb-6 shadow-inner">
              <i className="ph ph-wrench"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Nenhum reparo em andamento</h3>
            <p className="text-slate-500 max-w-xs mt-3 font-medium">As manutenções cadastradas aparecerão aqui com controle total de produção.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredRepairs.map(r => {
              const statusCfg = getStatusConfig(r.status);
              const stepIdx = getStatusIndex(r.status);
              
              return (
                <div key={r.id} className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group">
                  <div className="flex flex-col lg:flex-row">
                    {/* Lateral Info / Image */}
                    <div className="lg:w-72 h-64 lg:h-auto bg-slate-100 relative shrink-0">
                      {r.photo_url ? (
                        <img 
                          src={`local-img://${r.photo_url}`} 
                          className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500" 
                          alt="Device"
                          onError={(e) => (e.currentTarget.src = 'https://placehold.co/400x400/f1f5f9/94a3b8?text=Sem+Foto')}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50">
                          <i className="ph ph-device-mobile text-6xl mb-2 opacity-20"></i>
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-center px-4">Evidência Visual Indisponível</span>
                        </div>
                      )}
                      
                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                         <div className="px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-lg">
                          OS: {r.id.substring(0, 8)}
                        </div>
                        <button 
                          onClick={() => handleTogglePayment(r.id, r.payment_status)}
                          className={`px-3 py-1.5 rounded-full backdrop-blur-md text-[10px] font-black uppercase tracking-widest shadow-lg border transition-all ${r.payment_status === 'paid' ? 'bg-emerald-500/90 text-white border-emerald-400' : 'bg-red-500/90 text-white border-red-400 animate-pulse'}`}
                        >
                          <i className={`ph ${r.payment_status === 'paid' ? 'ph-check-circle' : 'ph-warning-circle'} mr-1`}></i>
                          {r.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                        </button>
                      </div>

                      <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-white/90 backdrop-blur-md shadow-xl border border-white/20">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter block mb-1">Loja de Origem</span>
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-lg bg-brand-500 text-white flex items-center justify-center text-[10px] font-bold">
                            {getStoreName(r.entry_store_id).charAt(0)}
                           </div>
                           <span className="text-xs font-black text-slate-700 truncate">{getStoreName(r.entry_store_id)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="flex-1 p-8 flex flex-col min-w-0">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">{r.device_brand}</span>
                            <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrada: {new Date(r.created_at).toLocaleDateString()}</span>
                          </div>
                          <h3 className="text-2xl font-black text-slate-800 tracking-tighter leading-none">{r.device_model}</h3>
                          <p className="text-slate-500 font-bold mt-1 text-sm flex items-center gap-2">
                            <i className="ph ph-user-circle text-lg"></i>
                            {r.customer_name} 
                            <span className="opacity-30">|</span> 
                            <span className="text-xs">{r.customer_phone}</span>
                          </p>
                        </div>
                        
                        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 transition-all ${statusCfg.color} border-current/10 shadow-sm`}>
                          <i className={`ph ${statusCfg.icon} text-2xl`}></i>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-tighter opacity-60">Status Atual</span>
                            <span className="text-xs font-black uppercase tracking-widest">{r.status}</span>
                          </div>
                        </div>
                      </div>

                      {/* Production Pipeline Visual */}
                      <div className="mb-10 relative">
                        <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-slate-100 -translate-y-1/2 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-brand-500 transition-all duration-1000" 
                            style={{ width: `${(stepIdx / (WORKFLOW_STEPS.length - 1)) * 100}%` }}
                          />
                        </div>
                        <div className="relative flex justify-between">
                          {WORKFLOW_STEPS.map((step, i) => (
                            <div key={i} className="flex flex-col items-center group/step">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black z-10 transition-all duration-500 border-4 ${i <= stepIdx ? 'bg-brand-500 text-white border-white shadow-lg' : 'bg-white text-slate-300 border-slate-100'}`}>
                                {i < stepIdx ? <i className="ph ph-check font-bold"></i> : i + 1}
                              </div>
                              <span className={`absolute -bottom-6 text-[8px] font-black uppercase tracking-tighter text-center whitespace-nowrap transition-all ${i === stepIdx ? 'text-brand-600 opacity-100' : 'opacity-0 group-hover/step:opacity-40'}`}>
                                {step}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Problema Relatado</span>
                          <p className="text-xs text-slate-700 leading-relaxed font-medium italic">"{r.issue_description || 'Sem detalhes técnicos fornecidos.'}"</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block italic text-right">Onde o aparelho está agora?</span>
                          <div className="flex items-center justify-end gap-2 text-brand-600">
                            <i className="ph ph-map-pin text-xl animate-bounce"></i>
                            <span className="text-xs font-black uppercase tracking-widest">{getStoreName(r.current_store_id)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-6">
                        <div className="bg-white px-6 py-3 rounded-2xl shadow-inner border border-slate-100">
                          <span className="text-[10px] font-black uppercase block tracking-tighter text-slate-400">Orçamento Previsto</span>
                          <span className="text-2xl font-mono font-black text-slate-800">R$ {Number(r.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex gap-3 flex-wrap">
                          {/* Logica de Avanco de Status Baseada no Workflow de 8 passos */}
                          
                          {/* Passo 1 -> 2: Sair da Origem */}
                          {r.status === 'Na Loja (Aguardando Envio)' && r.current_store_id === currentStoreId && (
                            <button 
                              onClick={() => handleUpdateStatus(r.id, 'Em Trânsito (Ida)', r.maintenance_store_id)}
                              className="bg-orange-500 text-white px-6 py-4 rounded-2xl hover:bg-orange-600 transition-all flex items-center gap-3 text-xs font-black uppercase tracking-widest shadow-xl shadow-orange-500/20"
                            >
                              <i className="ph ph-truck text-xl"></i>
                              Despachar para Lab
                            </button>
                          )}

                          {/* Passo 2 -> 3: Chegar no Lab */}
                          {r.status === 'Em Trânsito (Ida)' && r.maintenance_store_id === currentStoreId && (
                            <button 
                              onClick={() => handleUpdateStatus(r.id, 'Chegou no Laboratório', currentStoreId)}
                              className="bg-indigo-500 text-white px-6 py-4 rounded-2xl hover:bg-indigo-600 transition-all flex items-center gap-3 text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20"
                            >
                              <i className="ph ph-buildings text-xl"></i>
                              Receber no Laboratório
                            </button>
                          )}

                          {/* Passo 3 -> 4: Iniciar Manutencao */}
                          {r.status === 'Chegou no Laboratório' && r.current_store_id === currentStoreId && (
                            <button 
                              onClick={() => handleUpdateStatus(r.id, 'Em Manutenção', currentStoreId)}
                              className="bg-purple-500 text-white px-6 py-4 rounded-2xl hover:bg-purple-600 transition-all flex items-center gap-3 text-xs font-black uppercase tracking-widest shadow-xl shadow-purple-500/20"
                            >
                              <i className="ph ph-play-circle text-xl"></i>
                              Iniciar Conserto
                            </button>
                          )}

                          {/* Passo 4 -> 5: Concluir Manutencao */}
                          {r.status === 'Em Manutenção' && r.current_store_id === currentStoreId && (
                            <button 
                              onClick={() => handleUpdateStatus(r.id, 'Manutenção Concluída', currentStoreId)}
                              className="bg-emerald-500 text-white px-6 py-4 rounded-2xl hover:bg-emerald-600 transition-all flex items-center gap-3 text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20"
                            >
                              <i className="ph ph-check-fat text-xl"></i>
                              Concluir Reparo
                            </button>
                          )}

                          {/* Passo 5 -> 6: Voltar para Origem */}
                          {r.status === 'Manutenção Concluída' && r.current_store_id === currentStoreId && (
                            <button 
                              onClick={() => handleUpdateStatus(r.id, 'Em Trânsito (Volta)', r.entry_store_id)}
                              className="bg-blue-500 text-white px-6 py-4 rounded-2xl hover:bg-blue-600 transition-all flex items-center gap-3 text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20"
                            >
                              <i className="ph ph-bicycle text-xl"></i>
                              Enviar para Origem
                            </button>
                          )}

                          {/* Passo 6 -> 7: Chegar na Origem */}
                          {r.status === 'Em Trânsito (Volta)' && r.entry_store_id === currentStoreId && (
                            <button 
                              onClick={() => handleUpdateStatus(r.id, 'Disponível para Retirada', currentStoreId)}
                              className="bg-yellow-500 text-slate-800 px-6 py-4 rounded-2xl hover:bg-yellow-600 transition-all flex items-center gap-3 text-xs font-black uppercase tracking-widest shadow-xl shadow-yellow-500/20"
                            >
                              <i className="ph ph-storefront text-xl"></i>
                              Receber na Loja (Pronto)
                            </button>
                          )}

                          {/* Passo 7 -> 8: Entregar */}
                          {r.status === 'Disponível para Retirada' && r.entry_store_id === currentStoreId && (
                            <button 
                              onClick={() => handleUpdateStatus(r.id, 'Entregue', currentStoreId)}
                              className="bg-slate-800 text-white px-6 py-4 rounded-2xl hover:bg-slate-900 transition-all flex items-center gap-3 text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-400"
                            >
                              <i className="ph ph-handshake text-xl"></i>
                              Entregar e Finalizar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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