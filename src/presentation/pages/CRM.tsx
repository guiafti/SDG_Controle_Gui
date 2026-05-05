import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import TaskCompletionModal from '../components/TaskCompletionModal';

interface CRMProps {
  currentUser?: { id: string, name: string, role: string };
  currentStoreId?: string;
}

const CRM: React.FC<CRMProps> = ({ currentUser, currentStoreId }) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [city, setCity] = useState('ALMENARA');
  const [origin, setOrigin] = useState('');
  const [notes, setNotes] = useState('');

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [familyMembers, setFamilyMembers] = useState<{name: string, relation: string, phone: string}[]>([]);
  const [customFields, setCustomFields] = useState<{label: string, value: string}[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>(['CLIENTE FIEL', 'PAGADOR BOM', 'PAGADOR RUIM', 'RECORRENTE', 'NOVATO', 'VIP']);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await window.api.getCustomers();
      setCustomers(data || []);
    } catch (e) { toast.error('Erro ao carregar clientes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const parseNotes = (rawNotes: string) => {
    try {
      if (rawNotes.startsWith('{') && rawNotes.endsWith('}')) {
        const data = JSON.parse(rawNotes);
        setSelectedTags(data.tags || []);
        setFamilyMembers(data.family || []);
        setCustomFields(data.custom || []);
        setNotes(data.internal_notes || '');
      } else {
        setSelectedTags([]); setFamilyMembers([]); setCustomFields([]); setNotes(rawNotes || '');
      }
    } catch (e) { setNotes(rawNotes || ''); }
  };

  const openModal = async (customer: any = null) => {
    setEditingCustomer(customer);
    setName(customer?.name || '');
    setPhone(customer?.phone || '');
    setEmail(customer?.email || '');
    setAddress(customer?.address || '');
    setCpf(customer?.cpf || '');
    setRg(customer?.rg || '');
    setBirthDate(customer?.birth_date || '');
    setCity(customer?.city || 'ALMENARA');
    setOrigin(customer?.origin || '');
    parseNotes(customer?.notes || '');
    
    if (customer) {
      const history = await window.api.getSalesByCustomer(customer.id);
      setPurchaseHistory(history || []);
    } else {
      setPurchaseHistory([]);
    }
    
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Nome obrigatório!');
    const consolidatedNotes = JSON.stringify({ tags: selectedTags, family: familyMembers, custom: customFields, internal_notes: notes });
    const loadingId = toast.loading('Salvando...');
    try {
      const result = await window.api.saveCustomer({ id: editingCustomer?.id, name, phone, email, address, cpf, rg, birth_date: birthDate, city, origin, notes: consolidatedNotes });
      if (result.success) { toast.success('Salvo!'); setIsModalOpen(false); fetchCustomers(); }
    } catch (e) { toast.error('Erro'); }
    finally { toast.dismiss(loadingId); }
  };

  const addFamilyMember = () => setFamilyMembers([...familyMembers, { name: '', relation: '', phone: '' }]);
  const updateFamily = (index: number, field: string, val: string) => { const updated = [...familyMembers]; (updated[index] as any)[field] = val; setFamilyMembers(updated); };
  const removeFamily = (index: number) => setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  const addCustomField = () => setCustomFields([...customFields, { label: '', value: '' }]);
  const updateCustom = (index: number, field: string, val: string) => { const updated = [...customFields]; (updated[index] as any)[field] = val; setCustomFields(updated); };
  const removeCustom = (index: number) => setCustomFields(customFields.filter((_, i) => i !== index));
  const toggleTag = (tag: string) => { if (selectedTags.includes(tag)) setSelectedTags(selectedTags.filter(t => t !== tag)); else setSelectedTags([...selectedTags, tag]); };
  const addNewTag = () => { const tag = window.prompt('Nova Tag:'); if (tag) { setAvailableTags([...availableTags, tag.toUpperCase()]); setSelectedTags([...selectedTags, tag.toUpperCase()]); } };

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm) || c.cpf?.includes(searchTerm));

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden animate-in fade-in duration-500">
      <main className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar pb-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight text-brand-600 uppercase italic">Hub de Relacionamento (CRM)</h1>
            <p className="text-slate-500 font-medium text-xs mt-0.5 uppercase tracking-widest">Base de Clientes e Histórico de Fidelidade</p>
          </div>
          <button onClick={() => openModal()} className="bg-brand-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-600 shadow-lg shadow-brand-500/20 transition-all text-sm">+ Novo Cliente</button>
        </div>

        <input type="text" placeholder="Buscar por nome, telefone ou CPF..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 outline-none focus:ring-4 ring-brand-500/5 transition-all text-sm shadow-sm" />

        {loading ? <div className="py-20 text-center text-slate-300 font-bold uppercase text-xs animate-pulse">Sincronizando base...</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCustomers.map(c => (
              <div key={c.id} onClick={() => openModal(c)} className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:border-brand-400 hover:shadow-xl transition-all cursor-pointer group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition-all"><i className="ph ph-user-focus text-2xl"></i></div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-800 uppercase truncate leading-tight">{c.name}</h3>
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold text-brand-600 mt-0.5">{c.phone}</p>
                        {c.phone && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const cleanPhone = c.phone.replace(/\D/g, '');
                                    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
                                }}
                                className="mt-0.5 text-emerald-500 hover:text-emerald-600 transition-colors"
                                title="Enviar WhatsApp"
                            >
                                <i className="ph ph-whatsapp-logo text-sm"></i>
                            </button>
                        )}
                    </div>
                  </div>
                </div>
                <div className="space-y-1 pt-3 border-t border-slate-50 text-[10px] text-slate-400 font-bold">
                  <p className="uppercase"><i className="ph ph-map-pin mr-1"></i> {c.city || 'ALMENARA'}</p>
                  <p><i className="ph ph-identification-card mr-1"></i> {c.cpf || 'SEM CPF'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 text-brand-400 rounded-2xl flex items-center justify-center shadow-lg"><i className="ph ph-user-circle text-2xl"></i></div>
                <div><h2 className="text-xl font-bold text-slate-800 tracking-tight uppercase italic">{editingCustomer ? 'Perfil do Cliente' : 'Novo Cadastro'}</h2><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Inteligência de Vendas e Fidelização</p></div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 text-3xl transition-colors">&times;</button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              <form onSubmit={handleSave} className="flex-[2] p-8 overflow-y-auto custom-scrollbar border-r border-slate-100 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <section className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1">Dados Pessoais</h3>
                    <input required value={name} onChange={e => setName(e.target.value)} placeholder="NOME COMPLETO *" className="w-full p-3 bg-slate-50 border rounded-xl font-bold uppercase text-xs" />
                    <div className="grid grid-cols-2 gap-3">
                      <input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="WHATSAPP *" className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs" />
                      <input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="CPF" className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input value={rg} onChange={e => setRg(e.target.value)} placeholder="RG" className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs" />
                      <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs" />
                    </div>
                  </section>
                  <section className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1">Localização</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="NATURALIDADE" className="w-full p-3 bg-slate-50 border rounded-xl font-bold uppercase text-xs" />
                      <input value={city} onChange={e => setCity(e.target.value)} placeholder="CIDADE" className="w-full p-3 bg-slate-50 border rounded-xl font-bold uppercase text-xs" />
                    </div>
                    <input value={address} onChange={e => setAddress(e.target.value)} placeholder="ENDEREÇO COMPLETO" className="w-full p-3 bg-slate-50 border rounded-xl font-bold uppercase text-xs" />
                  </section>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <section className="space-y-4">
                    <div className="flex justify-between items-center"><h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1 flex-1">Classificação</h3><button type="button" onClick={addNewTag} className="text-[9px] text-brand-600 font-bold uppercase underline">Nova Tag</button></div>
                    <div className="flex flex-wrap gap-2">{availableTags.map(tag => ( <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`px-3 py-1.5 rounded-lg text-[8px] font-black border transition-all ${selectedTags.includes(tag) ? 'bg-slate-900 border-slate-900 text-brand-400' : 'bg-white border-slate-200 text-slate-400'}`}>{tag}</button> ))}</div>
                  </section>
                  <section className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1">Notas Estratégicas</h3>
                    <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Comentários sobre o perfil, preferências, etc..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-medium outline-none focus:border-brand-500 resize-none" />
                  </section>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 border-2 border-slate-100 text-slate-400 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">Descartar</button>
                  <button type="submit" className="flex-[2] py-4 bg-brand-500 text-white font-black rounded-2xl shadow-xl hover:bg-brand-600 uppercase text-xs tracking-widest transition-all">Gravar Perfil</button>
                </div>
              </form>

              <aside className="flex-1 bg-slate-50/50 p-8 overflow-y-auto custom-scrollbar">
                <h3 className="text-[11px] font-black uppercase text-slate-800 tracking-widest mb-6 flex items-center gap-2"><i className="ph ph-shopping-cart text-lg text-brand-500"></i> Histórico de Compras</h3>
                {purchaseHistory.length === 0 ? (
                  <div className="py-20 text-center opacity-30 flex flex-col items-center gap-3"><i className="ph ph-receipt text-5xl"></i><p className="text-[10px] font-bold uppercase">Sem registros de venda</p></div>
                ) : (
                  <div className="space-y-3">
                    {purchaseHistory.map(sale => (
                      <div key={sale.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-brand-300 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{new Date(sale.created_at).toLocaleDateString('pt-BR')} • {new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                          <span className="text-xs font-black text-brand-600 font-mono">R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="space-y-1">
                          {JSON.parse(sale.items).map((item: any, idx: number) => (
                            <p key={idx} className="text-[10px] text-slate-600 font-bold uppercase truncate flex justify-between"><span>{item.qtd}x {item.nome}</span> <span className="text-slate-300">R$ {item.preco.toLocaleString()}</span></p>
                          ))}
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-50 flex justify-between items-center">
                           <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">{sale.payment_method}</span>
                           <span className="text-[8px] font-bold text-slate-400 uppercase">Vendedor: {sale.vendedor}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;