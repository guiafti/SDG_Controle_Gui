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
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

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
    const loadingId = toast.loading('Atualizando fluxo...');
    try {
      const result = await window.api.updateRepairStatus({ id, status: newStatus, current_store_id: String(newLocationId) });
      if (result.success) {
        toast.success(`Movimentado: ${newStatus}`, { id: loadingId });
        await fetchData();
        // Atualiza o modal aberto se for o mesmo item
        if (selectedOrder?.id === id) {
          const updated = (await window.api.getRepairs()).find((r: any) => r.id === id);
          setSelectedOrder(updated);
        }
      } else {
        toast.error('Falha ao atualizar status', { id: loadingId });
      }
    } catch (error) {
      toast.error('Erro de comunicação', { id: loadingId });
    }
  };

  const handleTogglePayment = async (id: string, currentPayment: string) => {
    const newStatus = currentPayment === 'paid' ? 'pending' : 'paid';
    const loadingId = toast.loading('Financeiro...');
    try {
      const result = await window.api.updateRepairPayment({ id, payment_status: newStatus });
      if (result.success) {
        toast.success(newStatus === 'paid' ? 'PAGO' : 'PENDENTE', { id: loadingId });
        await fetchData();
        if (selectedOrder?.id === id) {
          const updated = (await window.api.getRepairs()).find((r: any) => r.id === id);
          setSelectedOrder(updated);
        }
      }
    } catch (error) { toast.error('Erro de rede', { id: loadingId }); }
  };

  const filteredRepairs = repairs.filter(r => {
    const matchesSearch = 
      r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.device_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.includes(searchTerm);
    
    if (filter === 'local') {
      return matchesSearch && String(r.current_store_id) === String(currentStoreId);
    }
    return matchesSearch;
  });

  const getStatusIndex = (status: string) => WORKFLOW_STEPS.indexOf(status);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Na Loja (Aguardando Envio)': return 'bg-slate-100 text-slate-600';
      case 'Em Manutenção': return 'bg-purple-100 text-purple-700';
      case 'Manutenção Concluída': return 'bg-emerald-100 text-emerald-700';
      case 'Disponível para Retirada': return 'bg-yellow-100 text-yellow-700';
      case 'Entregue': return 'bg-slate-800 text-white';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getStoreName = (id: string) => stores.find(s => String(s.id) === String(id))?.name || '...';

  const openWhatsApp = (phone: string, name: string, model: string) => {
    const msg = encodeURIComponent(`Olá ${name}, aqui é da ${getStoreName(currentStoreId)}. Sobre o seu ${model}...`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <main className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
        {/* Top Bar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            <button onClick={() => setFilter('local')} className={`px-5 py-2 rounded-lg text-xs font-black transition-all uppercase tracking-widest ${filter === 'local' ? 'bg-brand-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Minha Loja</button>
            <button onClick={() => setFilter('all')} className={`px-5 py-2 rounded-lg text-xs font-black transition-all uppercase tracking-widest ${filter === 'all' ? 'bg-brand-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Rede Total</button>
          </div>

          <div className="flex-1 max-w-lg w-full relative">
            <i className="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl"></i>
            <input 
              type="text" placeholder="Buscar cliente, aparelho ou OS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-brand-500 shadow-sm transition-all text-sm font-medium"
            />
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-500 text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-brand-600 shadow-lg shadow-brand-500/20 transition-all uppercase text-xs tracking-widest"
          >
            <i className="ph ph-plus-circle text-xl"></i> Nova Ordem
          </button>
        </div>

        {/* Compact List Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">OS / Data</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aparelho</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Prazo / Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-bold uppercase text-xs animate-pulse">Carregando dados...</td></tr>
              ) : filteredRepairs.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-bold uppercase text-xs italic">Nenhum registro encontrado.</td></tr>
              ) : filteredRepairs.map(r => (
                <tr 
                  key={r.id} onClick={() => setSelectedOrder(r)}
                  className="hover:bg-brand-50/50 cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="font-mono text-xs font-black text-brand-600">#{r.id.substring(0, 8)}</div>
                    <div className="text-[10px] text-slate-400 font-bold">{new Date(r.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-black text-slate-700">{r.customer_name}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Click para ver detalhes</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-slate-600">{r.device_brand}</div>
                    <div className="text-sm font-black text-slate-800 tracking-tighter">{r.device_model}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${getStatusColor(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-[10px] font-black text-red-500 uppercase">{r.delivery_date ? new Date(r.delivery_date).toLocaleDateString() : 'Sem Prazo'}</div>
                    <div className="text-sm font-black text-slate-800">R$ {Number(r.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div className="flex gap-6">
                <div className="w-24 h-24 rounded-3xl bg-slate-100 overflow-hidden border-2 border-white shadow-xl shrink-0">
                  {selectedOrder.photo_url ? (
                    <img src={`local-img://${selectedOrder.photo_url}`} className="w-full h-full object-cover" alt="OS" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><i className="ph ph-image text-3xl"></i></div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 rounded-full bg-brand-500 text-white text-[10px] font-black uppercase tracking-widest">OS: {selectedOrder.id.substring(0, 8)}</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${selectedOrder.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                      {selectedOrder.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tighter">{selectedOrder.device_brand} {selectedOrder.device_model}</h2>
                  <p className="text-slate-500 font-bold flex items-center gap-2 mt-1">
                    <i className="ph ph-user-circle text-xl"></i> {selectedOrder.customer_name} 
                    <button 
                      onClick={() => openWhatsApp(selectedOrder.customer_phone, selectedOrder.customer_name, selectedOrder.device_model)}
                      className="ml-2 text-emerald-500 hover:text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100"
                    >
                      <i className="ph ph-whatsapp-logo text-lg"></i>
                      <span className="text-[10px] font-black uppercase">WhatsApp</span>
                    </button>
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-12 h-12 rounded-full hover:bg-white hover:shadow-md flex items-center justify-center text-slate-400 transition-all">
                <i className="ph ph-x text-3xl"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
              {/* Visual Pipeline */}
              <div className="relative pt-4 pb-10">
                <div className="absolute top-8 left-0 right-0 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 transition-all duration-1000" style={{ width: `${(getStatusIndex(selectedOrder.status) / (WORKFLOW_STEPS.length - 1)) * 100}%` }} />
                </div>
                <div className="relative flex justify-between">
                  {WORKFLOW_STEPS.map((step, i) => {
                    const isActive = i <= getStatusIndex(selectedOrder.status);
                    return (
                      <div key={i} className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black z-10 transition-all duration-500 border-4 ${isActive ? 'bg-brand-500 text-white border-white shadow-lg' : 'bg-white text-slate-300 border-slate-100'}`}>
                          {i < getStatusIndex(selectedOrder.status) ? <i className="ph ph-check font-bold"></i> : i + 1}
                        </div>
                        <span className={`absolute -bottom-1 text-[7px] font-black uppercase tracking-tighter text-center whitespace-nowrap transition-all ${step === selectedOrder.status ? 'text-brand-600 opacity-100' : 'opacity-40'}`}>
                          {step.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Defeito Relatado</h3>
                    <p className="text-slate-700 italic font-medium">"{selectedOrder.issue_description || 'Sem descrição.'}"</p>
                  </div>
                  <div className="flex items-center justify-between px-2">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase block">Localização Atual</span>
                      <span className="text-sm font-black text-brand-600 uppercase flex items-center gap-1"><i className="ph ph-map-pin animate-bounce"></i> {getStoreName(selectedOrder.current_store_id)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-400 uppercase block">Loja de Retorno</span>
                      <span className="text-sm font-black text-slate-700 uppercase">{getStoreName(selectedOrder.return_store_id)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden">
                  <i className="ph ph-money absolute -right-6 -bottom-6 text-9xl opacity-10 -rotate-12"></i>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Valor do Conserto</span>
                  <div className="text-4xl font-black font-mono">R$ {Number(selectedOrder.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <div className="mt-6 flex gap-3">
                    <button 
                      onClick={() => handleTogglePayment(selectedOrder.id, selectedOrder.payment_status)}
                      className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${selectedOrder.payment_status === 'paid' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-white/10 hover:bg-white/20 border border-white/10'}`}
                    >
                      {selectedOrder.payment_status === 'paid' ? 'Marcar como Pendente' : 'Confirmar Pagamento'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button onClick={() => setSelectedOrder(null)} className="px-8 py-4 rounded-2xl border-2 border-slate-200 text-slate-500 font-black uppercase text-xs tracking-widest hover:bg-white transition-all">Fechar</button>
              <div className="flex-1 flex gap-3">
                {/* BOTÕES DINÂMICOS DE FLUXO - CORRIGIDOS COM String() */}
                {selectedOrder.status === 'Na Loja (Aguardando Envio)' && String(selectedOrder.current_store_id) === String(currentStoreId) && (
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Em Trânsito (Ida)', selectedOrder.maintenance_store_id)} className="flex-1 bg-orange-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-orange-500/20">Despachar para Lab</button>
                )}
                {selectedOrder.status === 'Em Trânsito (Ida)' && String(selectedOrder.maintenance_store_id) === String(currentStoreId) && (
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Chegou no Laboratório', currentStoreId)} className="flex-1 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20">Receber no Lab</button>
                )}
                {selectedOrder.status === 'Chegou no Laboratório' && String(selectedOrder.current_store_id) === String(currentStoreId) && (
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Em Manutenção', currentStoreId)} className="flex-1 bg-purple-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-purple-500/20">Iniciar Conserto</button>
                )}
                {selectedOrder.status === 'Em Manutenção' && String(selectedOrder.current_store_id) === String(currentStoreId) && (
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Manutenção Concluída', currentStoreId)} className="flex-1 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20">Concluir Reparo</button>
                )}
                {selectedOrder.status === 'Manutenção Concluída' && String(selectedOrder.current_store_id) === String(currentStoreId) && (
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Em Trânsito (Volta)', selectedOrder.return_store_id)} className="flex-1 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20">Enviar para Origem</button>
                )}
                {selectedOrder.status === 'Em Trânsito (Volta)' && String(selectedOrder.return_store_id) === String(currentStoreId) && (
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Disponível para Retirada', currentStoreId)} className="flex-1 bg-yellow-500 text-slate-800 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-yellow-500/20">Receber na Loja</button>
                )}
                {selectedOrder.status === 'Disponível para Retirada' && String(selectedOrder.current_store_id) === String(currentStoreId) && (
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Entregue', currentStoreId)} className="flex-1 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Finalizar Entrega</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <RepairOrderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchData} />
    </div>
  );
};

export default Repairs;