import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import RepairOrderModal from '../components/RepairOrderModal';
import PrintPreviewModal from '../components/PrintPreviewModal';

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [localNotes, setLocalNotes] = useState('');

  // Print Preview State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

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

  const handlePrintRepair = async () => {
    if (!selectedOrder) {
      console.warn('Print: No order selected');
      return;
    }
    
    try {
      const settings = await window.api.getSettings();
      const storeName = settings.find((s: any) => s.key === 'company_name')?.value || 'SDG CONTROLE';
      const logo = settings.find((s: any) => s.key === 'company_logo')?.value;
      
      setPreviewData({
        repair: selectedOrder,
        storeName,
        logo
      });
      setIsPreviewOpen(true);
    } catch (error: any) {
      toast.error('Erro ao preparar visualização');
    }
  };

  const confirmPrint = async () => {
    if (!previewData) return;
    
    setIsPreviewOpen(false);
    const loadingId = toast.loading('Enviando para impressora...');
    
    try {
      const result = await window.api.printRepairReceipt({ 
        repair: previewData.repair, 
        storeName: previewData.storeName, 
        logo: previewData.logo 
      });
      
      if (result && result.success) {
        toast.success('Enviado para impressora!', { id: loadingId });
      } else {
        toast.error(`Erro na impressão: ${result?.error || 'Desconhecido'}`, { id: loadingId });
      }
    } catch (error: any) {
      toast.error(`Falha ao imprimir: ${error.message || 'Erro de rede/comunicação'}`, { id: loadingId });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <main className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Assistência Técnica</h1>
            <p className="text-slate-500 font-medium text-xs mt-0.5">Gestão de Ordens de Serviço e Manutenção</p>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-600 shadow-md shadow-brand-500/20 transition-all text-sm"
          >
            <i className="ph ph-plus-circle text-xl"></i> Nova Ordem
          </button>
        </div>

        {/* Quick Stats Cards */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          <div className="flex-none bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500"><i className="ph ph-files text-lg"></i></div>
            <div>
              <div className="text-xs font-bold text-slate-800">{stats.total}</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total</div>
            </div>
          </div>
          <div className="flex-none bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-purple-500 flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-500"><i className="ph ph-wrench text-lg"></i></div>
            <div>
              <div className="text-xs font-bold text-slate-800">{stats.inService}</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">No Lab</div>
            </div>
          </div>
          <div className="flex-none bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-yellow-500 flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center text-yellow-600"><i className="ph ph-check-circle text-lg"></i></div>
            <div>
              <div className="text-xs font-bold text-slate-800">{stats.ready}</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Prontas</div>
            </div>
          </div>
          <div className="flex-none bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-red-500 flex items-center gap-3">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-500"><i className="ph ph-warning-circle text-lg"></i></div>
            <div>
              <div className="text-xs font-bold text-slate-800">{stats.pendingPayment}</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pendentes</div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 shrink-0">
            <button onClick={() => setFilter('local')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${filter === 'local' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Minha Loja</button>
            <button onClick={() => setFilter('all')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${filter === 'all' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Rede Total</button>
          </div>

          <div className="flex-1 relative">
            <i className="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
            <input 
              type="text" placeholder="Buscar por cliente, modelo, serial ou OS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-11 pr-4 outline-none focus:ring-2 ring-brand-500/10 transition-all text-sm font-medium text-slate-700 shadow-sm"
            />
          </div>
        </div>

        {/* Main List - Compact Cards */}
        <div className="space-y-2">
          {loading ? (
            <div className="py-20 text-center text-slate-300 font-bold uppercase text-xs animate-pulse">Sincronizando Ordens...</div>
          ) : filteredRepairs.length === 0 ? (
            <div className="py-32 text-center bg-white rounded-2xl border border-slate-100">
              <div className="flex flex-col items-center opacity-20">
                <i className="ph ph-folder-open text-6xl"></i>
                <p className="text-sm font-bold uppercase mt-2">Nenhuma ordem encontrada</p>
              </div>
            </div>
          ) : (
            filteredRepairs.map(r => {
              const isExpanded = expandedId === r.id;
              return (
                <div 
                  key={r.id} 
                  className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'ring-2 ring-brand-500/10 border-brand-200 shadow-lg' : 'border-slate-100 hover:border-slate-200 shadow-sm'}`}
                >
                  {/* Item Header - Collapsed View */}
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    className="p-3 cursor-pointer flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex-none flex items-center justify-center text-slate-400 overflow-hidden border border-slate-100">
                      {r.photo_url ? (
                        <img src={`local-img://${r.photo_url}`} className="w-full h-full object-cover" alt="OS" />
                      ) : (
                        <i className="ph ph-wrench text-xl"></i>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded uppercase">#{r.id.substring(0, 8)}</span>
                        <h3 className="text-xs font-bold text-slate-800 truncate uppercase tracking-tight">{r.customer_name}</h3>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1"><i className="ph ph-device-mobile"></i> {r.device_brand} {r.device_model}</span>
                        <span className="flex items-center gap-1"><i className="ph ph-calendar"></i> {new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="hidden md:flex flex-col items-end shrink-0 gap-1.5 px-4 border-x border-slate-100">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight border ${getStatusColor(r.status)}`}>
                        {r.status}
                      </span>
                      <div className="flex items-center gap-2">
                        {r.priority !== 'normal' && (
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${getPriorityColor(r.priority)}`}>
                            {r.priority}
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${r.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {r.payment_status === 'paid' ? 'PAGO' : 'PENDENTE'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 min-w-[80px]">
                      <div className="text-xs font-bold text-slate-800">R$ {Number(r.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div className={`text-[9px] font-bold uppercase ${new Date(r.delivery_date) < new Date() && r.status !== 'Entregue' ? 'text-red-500' : 'text-slate-400'}`}>
                        {r.delivery_date ? new Date(r.delivery_date).toLocaleDateString() : 'S/ PRAZO'}
                      </div>
                    </div>

                    <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <i className="ph ph-caret-down text-lg"></i>
                    </button>
                  </div>

                  {/* Item Expanded Content */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-slate-50 bg-slate-50/30 animate-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-2">
                          <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Defeito Relatado</h4>
                          <p className="text-[11px] text-slate-600 font-medium italic leading-relaxed line-clamp-2">"{r.issue_description || 'Sem descrição.'}"</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-2">
                          <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Laudo Técnico</h4>
                          <p className="text-[11px] text-slate-600 font-medium leading-relaxed line-clamp-2">{r.technical_notes || 'Aguardando avaliação.'}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => openWhatsApp(r.customer_phone, r.customer_name, r.device_model)}
                              className="flex-1 bg-emerald-50 text-emerald-600 p-2 rounded-lg border border-emerald-100 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase hover:bg-emerald-100 transition-colors"
                            >
                              <i className="ph ph-whatsapp-logo text-lg"></i> WhatsApp
                            </button>
                            <button 
                              onClick={() => openDetails(r)}
                              className="flex-1 bg-brand-50 text-brand-600 p-2 rounded-lg border border-brand-100 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase hover:bg-brand-100 transition-colors"
                            >
                              <i className="ph ph-eye text-lg"></i> Detalhes
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => { setSelectedOrder(r); handlePrintRepair(); }}
                              className="flex-1 bg-slate-50 text-slate-600 p-2 rounded-lg border border-slate-200 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase hover:bg-slate-100 transition-colors"
                            >
                              <i className="ph ph-printer text-lg"></i> Imprimir
                            </button>
                            <div className="flex-1 flex items-center justify-center px-2 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-bold uppercase cursor-default">
                              {r.status.split(' ')[0]}...
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-white overflow-hidden border border-slate-200 shadow-sm shrink-0 group relative">
                  {selectedOrder.photo_url ? (
                    <img src={`local-img://${selectedOrder.photo_url}`} className="w-full h-full object-cover" alt="OS" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200"><i className="ph ph-image text-3xl"></i></div>
                  )}
                  <div className={`absolute top-1 right-1 w-3 h-3 rounded-full border border-white shadow-sm ${getPriorityColor(selectedOrder.priority)}`}></div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-md bg-brand-500 text-white text-[10px] font-bold uppercase tracking-wider">OS: {selectedOrder.id.substring(0, 8)}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${selectedOrder.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                      {selectedOrder.payment_status === 'paid' ? 'PAGO' : 'PENDENTE'}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{selectedOrder.device_brand} {selectedOrder.device_model}</h2>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-slate-500 font-semibold text-sm flex items-center gap-1.5">
                      <i className="ph ph-user-circle text-xl text-brand-500"></i> {selectedOrder.customer_name} 
                    </p>
                    <button 
                      onClick={() => openWhatsApp(selectedOrder.customer_phone, selectedOrder.customer_name, selectedOrder.device_model)}
                      className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 transition-all text-[11px] font-bold uppercase"
                    >
                      <i className="ph ph-whatsapp-logo text-lg"></i>
                      <span>WhatsApp</span>
                    </button>
                    <button 
                      onClick={handlePrintRepair}
                      className="text-slate-600 hover:text-slate-700 flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 transition-all text-[11px] font-bold uppercase"
                    >
                      <i className="ph ph-printer text-lg"></i>
                      <span>Imprimir OS</span>
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                <i className="ph ph-x text-2xl"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
              {/* Visual Pipeline */}
              <div className="relative pt-2 pb-8 px-4">
                <div className="absolute top-6 left-10 right-10 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 transition-all duration-700" style={{ width: `${(getStatusIndex(selectedOrder.status) / (WORKFLOW_STEPS.length - 1)) * 100}%` }} />
                </div>
                <div className="relative flex justify-between">
                  {WORKFLOW_STEPS.map((step, i) => {
                    const isActive = i <= getStatusIndex(selectedOrder.status);
                    const isCurrent = step === selectedOrder.status;
                    return (
                      <div key={i} className="flex flex-col items-center group/step">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold z-10 transition-all duration-300 border-2 ${isCurrent ? 'bg-brand-500 text-white border-white shadow-md scale-110' : isActive ? 'bg-brand-100 text-brand-700 border-white' : 'bg-white text-slate-200 border-slate-50'}`}>
                          {i < getStatusIndex(selectedOrder.status) ? <i className="ph ph-check text-base font-bold"></i> : i + 1}
                        </div>
                        <span className={`absolute -bottom-4 text-[9px] font-bold uppercase tracking-tight text-center whitespace-nowrap transition-opacity ${isCurrent ? 'text-brand-600 opacity-100' : 'opacity-40'}`}>
                          {step.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Relatado pelo Cliente</h3>
                      <p className="text-slate-700 text-sm font-medium leading-relaxed italic">"{selectedOrder.issue_description || 'Sem descrição.'}"</p>
                    </div>
                    <div className="bg-brand-50/20 p-5 rounded-2xl border border-brand-100 relative group">
                      <h3 className="text-[10px] font-bold text-brand-500 uppercase tracking-wider mb-3 flex justify-between items-center">
                        Laudo Técnico
                        {!isEditingNotes && (
                          <button onClick={() => setIsEditingNotes(true)} className="text-brand-600 hover:underline flex items-center gap-1">
                            <i className="ph ph-pencil-simple"></i> Editar
                          </button>
                        )}
                      </h3>
                      {isEditingNotes ? (
                        <div className="space-y-3">
                          <textarea 
                            value={localNotes} onChange={e => setLocalNotes(e.target.value)}
                            className="w-full bg-white border border-brand-200 rounded-xl p-3 outline-none focus:ring-2 ring-brand-500/10 text-sm font-medium h-24 resize-none"
                            placeholder="Descreva a avaliação técnica..."
                          />
                          <div className="flex gap-2">
                            <button onClick={handleUpdateNotes} className="flex-1 bg-brand-500 text-white py-1.5 rounded-lg text-[10px] font-bold uppercase">Salvar</button>
                            <button onClick={() => setIsEditingNotes(false)} className="px-3 bg-slate-200 text-slate-500 py-1.5 rounded-lg text-[10px] font-bold uppercase">Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-brand-900 text-sm font-medium leading-relaxed">{selectedOrder.technical_notes || 'Aguardando avaliação técnica.'}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Checklist de Entrada</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedOrder.checklist ? selectedOrder.checklist.split(', ').map((item: string) => (
                        <span key={item} className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-tight border border-slate-100">{item}</span>
                      )) : <span className="text-slate-300 font-bold text-[10px] uppercase">Nenhum item deixado</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-brand-500 border border-slate-100"><i className="ph ph-map-pin text-xl"></i></div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Custódia Atual</span>
                        <span className="text-sm font-bold text-slate-800 uppercase">{getStoreName(selectedOrder.current_store_id)}</span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Destino</span>
                        <span className="text-sm font-bold text-slate-800 uppercase">{getStoreName(selectedOrder.return_store_id)}</span>
                      </div>
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100"><i className="ph ph-storefront text-xl"></i></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Valor Total</span>
                    <div className="text-3xl font-bold font-mono tracking-tight">R$ {Number(selectedOrder.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    
                    <div className="mt-6">
                      <button 
                        onClick={() => handleTogglePayment(selectedOrder.id, selectedOrder.payment_status)}
                        className={`w-full py-3 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all ${selectedOrder.payment_status === 'paid' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'}`}
                      >
                        {selectedOrder.payment_status === 'paid' ? 'Reverter para Pendente' : 'Confirmar Pagamento'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prioridade</span>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${getPriorityColor(selectedOrder.priority)}`}>{selectedOrder.priority}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prazo</span>
                      <span className="text-xs font-bold text-slate-800">{selectedOrder.delivery_date ? new Date(selectedOrder.delivery_date).toLocaleDateString() : 'Não Definido'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Serial</span>
                      <span className="text-xs font-bold text-slate-800 font-mono">{selectedOrder.serial_number || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button onClick={() => setSelectedOrder(null)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider hover:bg-white transition-all">Fechar</button>
              <div className="flex-1 flex gap-2">
                {selectedOrder.status === 'Na Loja (Aguardando Envio)' && String(selectedOrder.current_store_id) === String(currentStoreId) && (
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Em Trânsito (Ida)', selectedOrder.maintenance_store_id)} className="flex-1 bg-orange-500 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider shadow-md hover:bg-orange-600 transition-colors">Despachar para Lab</button>
                )}
                {selectedOrder.status === 'Em Trânsito (Ida)' && String(selectedOrder.maintenance_store_id) === String(currentStoreId) && (
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Chegou no Laboratório', currentStoreId)} className="flex-1 bg-indigo-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider shadow-md hover:bg-indigo-700 transition-colors">Receber no Lab</button>
                )}
                {selectedOrder.status === 'Chegou no Laboratório' && String(selectedOrder.current_store_id) === String(currentStoreId) && (
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Em Manutenção', currentStoreId)} className="flex-1 bg-purple-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider shadow-md hover:bg-purple-700 transition-colors">Iniciar Manutenção</button>
                )}
                {selectedOrder.status === 'Em Manutenção' && String(selectedOrder.current_store_id) === String(currentStoreId) && (
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Manutenção Concluída', currentStoreId)} className="flex-1 bg-emerald-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider shadow-md hover:bg-emerald-700 transition-colors">Concluir Manutenção</button>
                )}
                {selectedOrder.status === 'Manutenção Concluída' && String(selectedOrder.current_store_id) === String(currentStoreId) && (
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Em Trânsito (Volta)', selectedOrder.return_store_id)} className="flex-1 bg-blue-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider shadow-md hover:bg-blue-700 transition-colors">Enviar para Origem</button>
                )}
                {selectedOrder.status === 'Em Trânsito (Volta)' && String(selectedOrder.return_store_id) === String(currentStoreId) && (
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Disponível para Retirada', currentStoreId)} className="flex-1 bg-yellow-500 text-slate-800 rounded-xl font-bold uppercase text-[10px] tracking-wider shadow-md hover:bg-yellow-600 transition-colors">Pronto para Retirada</button>
                )}
                {selectedOrder.status === 'Disponível para Retirada' && String(selectedOrder.current_store_id) === String(currentStoreId) && (
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Entregue', currentStoreId)} className="flex-1 bg-slate-900 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider shadow-md hover:bg-black transition-colors">Finalizar Entrega</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <RepairOrderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchData} />
      
      {previewData && (
        <PrintPreviewModal 
          isOpen={isPreviewOpen} 
          onClose={() => setIsPreviewOpen(false)} 
          onConfirm={confirmPrint} 
          data={previewData} 
        />
      )}
    </div>
  );
};

export default Repairs;