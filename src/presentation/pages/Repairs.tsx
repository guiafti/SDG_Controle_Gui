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
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [localNotes, setLocalNotes] = useState('');

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

  const handleUpdateNotes = async () => {
    if (!selectedOrder) return;
    const loadingId = toast.loading('Salvando laudo...');
    try {
      const result = await window.api.updateRepairNotes({ id: selectedOrder.id, technical_notes: localNotes });
      if (result.success) {
        toast.success('Laudo técnico atualizado!', { id: loadingId });
        setIsEditingNotes(false);
        await fetchData();
        const updated = (await window.api.getRepairs()).find((r: any) => r.id === selectedOrder.id);
        setSelectedOrder(updated);
      }
    } catch (error) {
      toast.error('Erro ao salvar notas', { id: loadingId });
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
      r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.device_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.includes(searchTerm);
    
    if (filter === 'local') {
      return matchesSearch && String(r.current_store_id) === String(currentStoreId);
    }
    return matchesSearch;
  });

  const getStatusIndex = (status: string) => WORKFLOW_STEPS.indexOf(status);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Na Loja (Aguardando Envio)': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Em Manutenção': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Manutenção Concluída': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Disponível para Retirada': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Entregue': return 'bg-slate-800 text-white border-slate-800';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'normal': return 'bg-blue-500 text-white';
      case 'low': return 'bg-slate-400 text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  const getStoreName = (id: string) => stores.find(s => String(s.id) === String(id))?.name || '...';

  const openWhatsApp = (phone: string, name: string, model: string) => {
    const msg = encodeURIComponent(`Olá ${name}, aqui é da ${getStoreName(currentStoreId)}. Sobre o seu ${model}...`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
  };

  // Stats
  const stats = {
    total: filteredRepairs.length,
    inService: filteredRepairs.filter(r => r.status === 'Em Manutenção').length,
    ready: filteredRepairs.filter(r => r.status === 'Disponível para Retirada').length,
    pendingPayment: filteredRepairs.filter(r => r.payment_status !== 'paid' && r.status === 'Entregue').length
  };

  const maskPhone = (val: string) => {
    const cleaned = val.replace(/\D/g, '').substring(0, 11);
    if (cleaned.length <= 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const openDetails = (order: any) => {
    setSelectedOrder(order);
    setLocalNotes(order.technical_notes || '');
    setIsEditingNotes(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <main className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Assistência Técnica</h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Gestão de Ordens de Serviço e Manutenção</p>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-500 text-white px-8 py-4 rounded-[24px] font-black flex items-center gap-3 hover:bg-brand-600 shadow-xl shadow-brand-500/30 transition-all uppercase text-xs tracking-[0.2em]"
          >
            <i className="ph ph-plus-circle text-2xl"></i> Nova Ordem
          </button>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-2">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500"><i className="ph ph-files text-xl"></i></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
            </div>
            <div className="text-2xl font-black text-slate-800">{stats.total}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Ordens Filtradas</div>
          </div>
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 border-l-4 border-l-purple-500">
            <div className="flex justify-between items-start mb-2">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500"><i className="ph ph-wrench text-xl"></i></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Lab</span>
            </div>
            <div className="text-2xl font-black text-slate-800">{stats.inService}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Em Manutenção</div>
          </div>
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 border-l-4 border-l-yellow-500">
            <div className="flex justify-between items-start mb-2">
              <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center text-yellow-600"><i className="ph ph-check-circle text-xl"></i></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prontas</span>
            </div>
            <div className="text-2xl font-black text-slate-800">{stats.ready}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Aguardando Retirada</div>
          </div>
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 border-l-4 border-l-red-500">
            <div className="flex justify-between items-start mb-2">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500"><i className="ph ph-warning-circle text-xl"></i></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendentes</span>
            </div>
            <div className="text-2xl font-black text-slate-800">{stats.pendingPayment}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Débito Pós-Entrega</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col lg:flex-row gap-4 bg-white p-3 rounded-[28px] shadow-sm border border-slate-200">
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button onClick={() => setFilter('local')} className={`px-6 py-3 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${filter === 'local' ? 'bg-white text-brand-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Minha Loja</button>
            <button onClick={() => setFilter('all')} className={`px-6 py-3 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${filter === 'all' ? 'bg-white text-brand-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Rede Total</button>
          </div>

          <div className="flex-1 relative">
            <i className="ph ph-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-xl"></i>
            <input 
              type="text" placeholder="Buscar por cliente, modelo, serial ou OS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-14 pr-6 outline-none focus:ring-2 ring-brand-500/20 transition-all text-sm font-bold text-slate-700"
            />
          </div>
        </div>

        {/* Main List Table */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">OS / Data</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aparelho / Serial</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status / Prioridade</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Prazo / Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="px-8 py-24 text-center text-slate-300 font-black uppercase text-xs animate-pulse">Sincronizando Ordens...</td></tr>
              ) : filteredRepairs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center opacity-20">
                      <i className="ph ph-folder-open text-8xl"></i>
                      <p className="text-sm font-black uppercase mt-4">Nenhuma ordem encontrada</p>
                    </div>
                  </td>
                </tr>
              ) : filteredRepairs.map(r => (
                <tr 
                  key={r.id} onClick={() => openDetails(r)}
                  className="hover:bg-brand-50/30 cursor-pointer transition-all group"
                >
                  <td className="px-8 py-5">
                    <div className="font-mono text-xs font-black text-brand-600">#{r.id.substring(0, 8)}</div>
                    <div className="text-[10px] text-slate-400 font-bold">{new Date(r.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-sm font-black text-slate-700">{r.customer_name}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{r.customer_phone ? maskPhone(r.customer_phone) : 'Sem Telefone'}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-sm font-black text-slate-800 tracking-tighter">{r.device_brand} {r.device_model}</div>
                    <div className="text-[10px] text-slate-400 font-mono uppercase">{r.serial_number || 'S/N'}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1.5 items-start">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${getStatusColor(r.status)}`}>
                        {r.status}
                      </span>
                      {r.priority !== 'normal' && (
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${getPriorityColor(r.priority)}`}>
                          {r.priority}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className={`text-[10px] font-black uppercase ${new Date(r.delivery_date) < new Date() && r.status !== 'Entregue' ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                      {r.delivery_date ? new Date(r.delivery_date).toLocaleDateString() : 'Sem Prazo'}
                    </div>
                    <div className="text-lg font-black text-slate-800">R$ {Number(r.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
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
          <div className="bg-white rounded-[40px] shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div className="flex gap-8">
                <div className="w-32 h-32 rounded-[32px] bg-white overflow-hidden border-4 border-white shadow-2xl shrink-0 group relative">
                  {selectedOrder.photo_url ? (
                    <img src={`local-img://${selectedOrder.photo_url}`} className="w-full h-full object-cover" alt="OS" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200"><i className="ph ph-image text-5xl"></i></div>
                  )}
                  <div className={`absolute top-2 right-2 w-4 h-4 rounded-full border-2 border-white shadow-sm ${getPriorityColor(selectedOrder.priority)}`}></div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-4 py-1 rounded-full bg-brand-500 text-white text-[10px] font-black uppercase tracking-widest">OS: {selectedOrder.id.substring(0, 8)}</span>
                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${selectedOrder.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                      {selectedOrder.payment_status === 'paid' ? 'Financeiro: PAGO' : 'Financeiro: PENDENTE'}
                    </span>
                  </div>
                  <h2 className="text-4xl font-black text-slate-800 tracking-tighter">{selectedOrder.device_brand} {selectedOrder.device_model}</h2>
                  <div className="flex items-center gap-6 mt-2">
                    <p className="text-slate-500 font-bold flex items-center gap-2">
                      <i className="ph ph-user-circle text-2xl text-brand-500"></i> {selectedOrder.customer_name} 
                    </p>
                    <button 
                      onClick={() => openWhatsApp(selectedOrder.customer_phone, selectedOrder.customer_name, selectedOrder.device_model)}
                      className="text-emerald-500 hover:text-emerald-600 flex items-center gap-2 bg-emerald-50 px-4 py-1.5 rounded-2xl border border-emerald-100 transition-all hover:scale-105 active:scale-95"
                    >
                      <i className="ph ph-whatsapp-logo text-2xl"></i>
                      <span className="text-[10px] font-black uppercase">Contatar Cliente</span>
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-14 h-14 rounded-full hover:bg-white hover:shadow-lg flex items-center justify-center text-slate-300 hover:text-red-500 transition-all">
                <i className="ph ph-x text-4xl"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
              {/* Visual Pipeline */}
              <div className="relative pt-4 pb-12">
                <div className="absolute top-10 left-4 right-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 transition-all duration-1000 shadow-[0_0_15px_rgba(var(--brand-500-rgb),0.5)]" style={{ width: `${(getStatusIndex(selectedOrder.status) / (WORKFLOW_STEPS.length - 1)) * 100}%` }} />
                </div>
                <div className="relative flex justify-between px-2">
                  {WORKFLOW_STEPS.map((step, i) => {
                    const isActive = i <= getStatusIndex(selectedOrder.status);
                    const isCurrent = step === selectedOrder.status;
                    return (
                      <div key={i} className="flex flex-col items-center group/step">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black z-10 transition-all duration-500 border-4 ${isCurrent ? 'bg-brand-500 text-white border-white shadow-xl scale-110' : isActive ? 'bg-brand-200 text-brand-700 border-white shadow-md' : 'bg-white text-slate-200 border-slate-50'}`}>
                          {i < getStatusIndex(selectedOrder.status) ? <i className="ph ph-check text-xl font-bold"></i> : i + 1}
                        </div>
                        <span className={`absolute -bottom-2 text-[8px] font-black uppercase tracking-tighter text-center whitespace-nowrap transition-all ${isCurrent ? 'text-brand-600 opacity-100 scale-110' : 'opacity-30'}`}>
                          {step.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 shadow-inner">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Relatado pelo Cliente</h3>
                      <p className="text-slate-700 font-medium italic leading-relaxed">"{selectedOrder.issue_description || 'Sem descrição.'}"</p>
                    </div>
                    <div className="bg-brand-50/30 p-8 rounded-[40px] border border-brand-100 relative group">
                      <h3 className="text-[10px] font-black text-brand-400 uppercase tracking-[0.2em] mb-4 flex justify-between items-center">
                        Laudo Técnico Preliminar
                        {!isEditingNotes && (
                          <button onClick={() => setIsEditingNotes(true)} className="text-brand-500 hover:text-brand-600 flex items-center gap-1">
                            <i className="ph ph-pencil-simple"></i> Editar
                          </button>
                        )}
                      </h3>
                      {isEditingNotes ? (
                        <div className="space-y-3">
                          <textarea 
                            value={localNotes} onChange={e => setLocalNotes(e.target.value)}
                            className="w-full bg-white border border-brand-200 rounded-2xl p-4 outline-none focus:ring-2 ring-brand-500/20 text-slate-700 font-medium h-32 resize-none"
                            placeholder="Descreva a avaliação técnica..."
                          />
                          <div className="flex gap-2">
                            <button onClick={handleUpdateNotes} className="flex-1 bg-brand-500 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Salvar Laudo</button>
                            <button onClick={() => setIsEditingNotes(false)} className="px-4 bg-slate-200 text-slate-500 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-brand-900 font-medium leading-relaxed">{selectedOrder.technical_notes || 'Aguardando avaliação técnica.'}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[40px] border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Checklist de Entrada</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedOrder.checklist ? selectedOrder.checklist.split(', ').map((item: string) => (
                        <span key={item} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200">{item}</span>
                      )) : <span className="text-slate-300 font-bold text-xs italic uppercase">Nenhum item deixado</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-brand-500 border border-slate-100"><i className="ph ph-map-pin text-2xl animate-bounce"></i></div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase block tracking-widest">Custódia Atual</span>
                        <span className="text-lg font-black text-slate-800 uppercase">{getStoreName(selectedOrder.current_store_id)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-400 uppercase block tracking-widest">Destino de Retorno</span>
                      <span className="text-lg font-black text-slate-800 uppercase flex items-center gap-2 justify-end">{getStoreName(selectedOrder.return_store_id)} <i className="ph ph-storefront text-slate-300"></i></span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-900 rounded-[48px] p-10 text-white relative overflow-hidden shadow-2xl">
                    <i className="ph ph-money absolute -right-10 -bottom-10 text-[200px] opacity-5 -rotate-12"></i>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Valor Total do Reparo</span>
                    <div className="text-5xl font-black font-mono tracking-tighter">R$ {Number(selectedOrder.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    
                    <div className="mt-10 space-y-3">
                      <button 
                        onClick={() => handleTogglePayment(selectedOrder.id, selectedOrder.payment_status)}
                        className={`w-full py-5 rounded-[24px] font-black uppercase text-[10px] tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 ${selectedOrder.payment_status === 'paid' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'}`}
                      >
                        {selectedOrder.payment_status === 'paid' ? 'Reverter para Pendente' : 'Confirmar Pagamento'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-[40px] p-8 border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prioridade</span>
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${getPriorityColor(selectedOrder.priority)}`}>{selectedOrder.priority}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prazo</span>
                      <span className="text-sm font-black text-slate-800">{selectedOrder.delivery_date ? new Date(selectedOrder.delivery_date).toLocaleDateString() : 'Não Definido'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Serial</span>
                      <span className="text-sm font-black text-slate-800 font-mono">{selectedOrder.serial_number || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-6">
              <button onClick={() => setSelectedOrder(null)} className="px-10 py-5 rounded-[28px] border-2 border-slate-200 text-slate-500 font-black uppercase text-xs tracking-widest hover:bg-white transition-all">Sair da Visualização</button>
              <div className="flex-1 flex gap-4">
                {selectedOrder.status === 'Na Loja (Aguardando Envio)' && String(selectedOrder.current_store_id) === String(currentStoreId) && (
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Em Trânsito (Ida)', selectedOrder.maintenance_store_id)} className="flex-1 bg-orange-500 text-white rounded-[28px] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-orange-500/20 hover:scale-[1.02] transition-transform">Despachar para Laboratório</button>
                )}
                {selectedOrder.status === 'Em Trânsito (Ida)' && String(selectedOrder.maintenance_store_id) === String(currentStoreId) && (
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Chegou no Laboratório', currentStoreId)} className="flex-1 bg-indigo-600 text-white rounded-[28px] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition-transform">Receber no Laboratório</button>
                )}
                {selectedOrder.status === 'Chegou no Laboratório' && String(selectedOrder.current_store_id) === String(currentStoreId) && (
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Em Manutenção', currentStoreId)} className="flex-1 bg-purple-600 text-white rounded-[28px] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-purple-500/20 hover:scale-[1.02] transition-transform">Iniciar Procedimento Técnico</button>
                )}
                {selectedOrder.status === 'Em Manutenção' && String(selectedOrder.current_store_id) === String(currentStoreId) && (
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Manutenção Concluída', currentStoreId)} className="flex-1 bg-emerald-600 text-white rounded-[28px] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:scale-[1.02] transition-transform">Concluir Manutenção</button>
                )}
                {selectedOrder.status === 'Manutenção Concluída' && String(selectedOrder.current_store_id) === String(currentStoreId) && (
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Em Trânsito (Volta)', selectedOrder.return_store_id)} className="flex-1 bg-blue-600 text-white rounded-[28px] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-transform">Enviar para Origem</button>
                )}
                {selectedOrder.status === 'Em Trânsito (Volta)' && String(selectedOrder.return_store_id) === String(currentStoreId) && (
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Disponível para Retirada', currentStoreId)} className="flex-1 bg-yellow-500 text-slate-800 rounded-[28px] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-yellow-500/20 hover:scale-[1.02] transition-transform">Disponibilizar para Retirada</button>
                )}
                {selectedOrder.status === 'Disponível para Retirada' && String(selectedOrder.current_store_id) === String(currentStoreId) && (
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Entregue', currentStoreId)} className="flex-1 bg-slate-900 text-white rounded-[28px] font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-transform">Finalizar Entrega ao Cliente</button>
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