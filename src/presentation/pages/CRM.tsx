import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

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

  // Fixed/Default Tags
  const DEFAULT_TAGS = ['CLIENTE FIEL', 'PAGADOR BOM', 'PAGADOR RUIM', 'RECORRENTE', 'NOVATO', 'VIP'];
  const [availableTags, setAvailableTags] = useState<string[]>(DEFAULT_TAGS);

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

  // Social/Dynamic states
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [familyMembers, setFamilyMembers] = useState<{name: string, relation: string, phone: string}[]>([]);
  const [customFields, setCustomFields] = useState<{label: string, value: string}[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [missionsExpanded, setMissionsExpanded] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cData, tData] = await Promise.all([
        window.api.getCustomers(),
        window.api.getTasks()
      ]);
      setCustomers(cData || []);
      setTasks(tData || []);
    } catch (e) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleTaskStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    const res = await window.api.toggleTask(id, newStatus);
    if (res.success) {
      toast.success('Missão Cumprida!');
      fetchData();
    }
  };

  // Filter tasks: Show pending ones that are assigned to the whole store OR this specific user
  const pendingTasks = tasks.filter(t => {
    if (t.status !== 'pending') return false;
    
    // For admins, show all
    if (currentUser?.role === 'admin') return true;

    // For operators, filter by store or specific name
    const isStoreTask = t.assignee_type === 'store' && t.assignee_id === currentStoreId;
    const isMyTask = t.assignee_type === 'user' && (
      t.assignee_id === currentUser?.id || 
      t.assignee_id === currentUser?.name
    );
    
    return isStoreTask || isMyTask;
  });

  // Logic to parse structured data from the 'notes' text field
  const parseNotes = (rawNotes: string) => {
    try {
      if (rawNotes.startsWith('{') && rawNotes.endsWith('}')) {
        const data = JSON.parse(rawNotes);
        setSelectedTags(data.tags || []);
        setFamilyMembers(data.family || []);
        setCustomFields(data.custom || []);
        setNotes(data.internal_notes || '');
        
        // Add unknown tags to available ones
        const newTags = (data.tags || []).filter((t: string) => !availableTags.includes(t));
        if (newTags.length > 0) setAvailableTags([...availableTags, ...newTags]);
      } else {
        setSelectedTags([]);
        setFamilyMembers([]);
        setCustomFields([]);
        setNotes(rawNotes);
      }
    } catch (e) {
      setNotes(rawNotes);
    }
  };

  const openModal = (customer: any = null) => {
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
    
    if (customer?.notes) {
      parseNotes(customer.notes);
    } else {
      setSelectedTags([]);
      setFamilyMembers([]);
      setCustomFields([]);
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('O nome do cliente é obrigatório!');

    const consolidatedNotes = JSON.stringify({
      tags: selectedTags,
      family: familyMembers,
      custom: customFields,
      internal_notes: notes
    });

    const loadingId = toast.loading('Salvando perfil estratégico...');
    try {
      const result = await window.api.saveCustomer({
        id: editingCustomer?.id,
        name, phone, email, address,
        cpf, rg, birth_date: birthDate, city, origin, 
        notes: consolidatedNotes
      });

      if (result.success) {
        toast.success('Cliente gravado com sucesso!', { id: loadingId });
        setIsModalOpen(false);
        fetchData();
      } else {
        toast.error('Erro ao salvar cliente', { id: loadingId });
      }
    } catch (e) {
      toast.error('Erro de comunicação', { id: loadingId });
    }
  };

  const addFamilyMember = () => setFamilyMembers([...familyMembers, { name: '', relation: '', phone: '' }]);
  const updateFamily = (index: number, field: string, val: string) => {
    const updated = [...familyMembers];
    (updated[index] as any)[field] = val;
    setFamilyMembers(updated);
  };
  const removeFamily = (index: number) => setFamilyMembers(familyMembers.filter((_, i) => i !== index));

  const addCustomField = () => setCustomFields([...customFields, { label: '', value: '' }]);
  const updateCustom = (index: number, field: string, val: string) => {
    const updated = [...customFields];
    (updated[index] as any)[field] = val;
    setCustomFields(updated);
  };
  const removeCustom = (index: number) => setCustomFields(customFields.filter((_, i) => i !== index));

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) setSelectedTags(selectedTags.filter(t => t !== tag));
    else setSelectedTags([...selectedTags, tag]);
  };
  const addNewTag = () => {
    const tag = window.prompt('Digite o nome da nova Tag:');
    if (tag && !availableTags.includes(tag.toUpperCase())) {
      const newTag = tag.toUpperCase().trim();
      setAvailableTags(prev => [...prev, newTag]);
      setSelectedTags(prev => [...prev, newTag]);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cpf?.includes(searchTerm)
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden animate-in fade-in duration-500">
      <main className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar pb-20">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">CRM - Gestão de Clientes</h1>
            <p className="text-slate-500 font-medium text-xs mt-0.5">Base de Dados e Inteligência de Relacionamento</p>
          </div>
          
          <button 
            onClick={() => openModal()}
            className="bg-brand-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-600 shadow-md shadow-brand-500/20 transition-all text-sm"
          >
            <i className="ph ph-user-circle-plus text-xl"></i> Novo Cadastro
          </button>
        </div>

        {/* Minhas Missões - Dynamic Task Panel */}
        <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-500 ${missionsExpanded ? 'max-h-[500px]' : 'max-h-[64px]'}`}>
           <div className="p-4 flex justify-between items-center cursor-pointer bg-slate-900 text-white" onClick={() => setMissionsExpanded(!missionsExpanded)}>
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white shadow-lg animate-pulse"><i className="ph ph-shield-check text-xl"></i></div>
                 <div>
                    <h3 className="text-xs font-black uppercase italic leading-none">Minhas Missões</h3>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">{pendingTasks.length} Comandos Pendentes</p>
                 </div>
              </div>
              <i className="ph ph-caret-down text-slate-500 transition-transform" style={{ transform: missionsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}></i>
           </div>
           <div className="p-3 space-y-2">
              {pendingTasks.length === 0 ? (
                <div className="py-6 text-center text-slate-300 font-bold uppercase text-[9px]">Tudo em ordem! Nenhuma tarefa pendente.</div>
              ) : pendingTasks.map(t => (
                <div key={t.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-brand-300 transition-all">
                   <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-slate-700 uppercase truncate leading-none mb-1">{t.title}</p>
                      <p className="text-[8px] text-slate-400 font-black uppercase italic">Prazo: {t.due_date || 'Imediato'}</p>
                   </div>
                   <button onClick={() => toggleTaskStatus(t.id, t.status)} className="px-3 py-1 bg-brand-500 text-white rounded-lg text-[9px] font-black uppercase hover:bg-brand-600 shadow-md">OK</button>
                </div>
              ))}
           </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <i className="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
          <input 
            type="text" placeholder="Buscar por nome, CPF ou características..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 outline-none focus:ring-2 ring-brand-500/10 transition-all text-sm font-medium text-slate-700 shadow-sm"
          />
        </div>

        {/* Customer Grid */}
        {loading ? (
          <div className="py-20 text-center text-slate-300 font-bold uppercase text-xs animate-pulse">Carregando base...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-32 text-center bg-white rounded-2xl border border-slate-100">
            <div className="flex flex-col items-center opacity-20">
              <i className="ph ph-users-four text-6xl"></i>
              <p className="text-sm font-bold uppercase mt-2">Nenhum cliente na lista</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
            {filteredCustomers.map(c => {
              let parsed: any = {};
              try { parsed = JSON.parse(c.notes); } catch(e) {}
              const tags = parsed.tags || [];

              return (
                <div 
                  key={c.id} onClick={() => openModal(c)}
                  className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:border-brand-300 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors">
                      <i className="ph ph-user-focus text-xl"></i>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-800 uppercase truncate">{c.name}</h3>
                      <p className="text-[10px] font-bold text-brand-600 mt-0.5">{c.phone || '(00) 00000-0000'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {tags.map((t: string) => (
                      <span key={t} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[7px] font-bold rounded uppercase">
                        {t}
                      </span>
                    ))}
                  </div>
                  
                  <div className="space-y-2 border-t border-slate-50 pt-3">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <i className="ph ph-identification-card"></i>
                      <span>{c.cpf || 'CPF NÃO CONSTA'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                      <i className="ph ph-map-pin text-brand-500"></i>
                      <span className="truncate uppercase">{c.city || 'ALMENARA'}</span>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Clean CRM Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-50 text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                  <i className="ph ph-user-circle text-xl"></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 tracking-tight">{editingCustomer ? 'Editar Perfil' : 'Novo Cliente'}</h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Gestão Estratégica CRM</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
                <i className="ph ph-x text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto custom-scrollbar space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Coluna 1: Dados e Tags */}
                <div className="space-y-6">
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1 h-3 bg-brand-500 rounded-full"></div>
                      <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Identificação</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome Completo *</label>
                        <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="NOME DO CLIENTE" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-500 transition-all uppercase" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">WhatsApp *</label>
                          <input type="text" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-500 transition-all" />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">CPF</label>
                          <input type="text" value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 transition-all" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">RG</label>
                          <input type="text" value={rg} onChange={e => setRg(e.target.value)} placeholder="Opcional" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 transition-all" />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nascimento</label>
                          <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 transition-all" />
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-3 bg-brand-500 rounded-full"></div>
                        <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Classificação</h3>
                      </div>
                      <button type="button" onClick={addNewTag} className="text-[8px] font-bold text-brand-600 uppercase underline">Nova Tag</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {availableTags.map(tag => (
                        <button
                          key={tag} type="button" onClick={() => toggleTag(tag)}
                          className={`px-2 py-1 rounded-lg text-[8px] font-bold transition-all border ${selectedTags.includes(tag) ? 'bg-brand-500 border-brand-500 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-3 bg-brand-500 rounded-full"></div>
                        <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Núcleo Familiar</h3>
                      </div>
                      <button type="button" onClick={addFamilyMember} className="text-[8px] font-bold text-brand-600 uppercase">+ Adicionar</button>
                    </div>
                    <div className="space-y-2">
                      {familyMembers.map((member, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                          <input placeholder="Nome" value={member.name} onChange={e => updateFamily(idx, 'name', e.target.value)} className="flex-1 bg-transparent text-[10px] font-bold uppercase outline-none" />
                          <select value={member.relation} onChange={e => updateFamily(idx, 'relation', e.target.value)} className="w-20 bg-transparent text-[9px] font-bold outline-none">
                            <option value="">Relação</option>
                            <option value="ESPOSO(A)">ESPOSO(A)</option>
                            <option value="FILHO(A)">FILHO(A)</option>
                            <option value="PAI/MÃE">PAI/MÃE</option>
                          </select>
                          <button type="button" onClick={() => removeFamily(idx)} className="text-red-400"><i className="ph ph-trash"></i></button>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Coluna 2: Local e Preferências */}
                <div className="space-y-6">
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1 h-3 bg-brand-500 rounded-full"></div>
                      <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Localidade</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Naturalidade</label>
                          <input type="text" value={origin} onChange={e => setOrigin(e.target.value)} placeholder="CIDADE/UF" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 uppercase" />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cidade Atual</label>
                          <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="ALMENARA" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 uppercase" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Endereço Residencial</label>
                        <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua, Número, Bairro..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 uppercase" />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-3 bg-brand-500 rounded-full"></div>
                        <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Preferências e Hobbies</h3>
                      </div>
                      <button type="button" onClick={addCustomField} className="text-[8px] font-bold text-brand-600 uppercase">+ Novo Campo</button>
                    </div>
                    <div className="space-y-2">
                      {customFields.map((cf, idx) => (
                        <div key={idx} className="flex gap-2 p-2 bg-slate-50/50 rounded-xl border border-slate-100 items-center">
                          <input placeholder="Título" value={cf.label} onChange={e => updateCustom(idx, 'label', e.target.value)} className="w-20 bg-transparent text-[9px] font-black uppercase outline-none" />
                          <input placeholder="Valor" value={cf.value} onChange={e => updateCustom(idx, 'value', e.target.value)} className="flex-1 bg-transparent text-[10px] font-bold uppercase outline-none" />
                          <button type="button" onClick={() => removeCustom(idx)} className="text-red-400"><i className="ph ph-x-circle text-lg"></i></button>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1 h-3 bg-brand-500 rounded-full"></div>
                      <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Notas de Relacionamento</h3>
                    </div>
                    <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detalhes estratégicos..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-brand-500 transition-all resize-none" />
                  </section>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-all uppercase text-[10px] tracking-widest">Cancelar</button>
                <button type="submit" className="flex-[2] py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 shadow-md shadow-brand-500/20 transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                  <i className="ph ph-check-circle text-lg"></i> Gravar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;