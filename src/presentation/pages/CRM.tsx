import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const CRM: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await window.api.getCustomers();
      setCustomers(data || []);
    } catch (e) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

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
    setNotes(customer?.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('O nome do cliente é obrigatório!');

    const loadingId = toast.loading('Salvando cliente...');
    try {
      const result = await window.api.saveCustomer({
        id: editingCustomer?.id,
        name, phone, email, address,
        cpf, rg, birth_date: birthDate, city, origin, notes
      });

      if (result.success) {
        toast.success('Cliente salvo com sucesso!', { id: loadingId });
        setIsModalOpen(false);
        fetchCustomers();
      } else {
        toast.error('Erro ao salvar cliente', { id: loadingId });
      }
    } catch (e) {
      toast.error('Erro de comunicação', { id: loadingId });
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
      <main className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        
        {/* Header Section */}
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

        {/* Search Bar */}
        <div className="relative">
          <i className="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
          <input 
            type="text" placeholder="Buscar por nome, telefone, e-mail ou CPF..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCustomers.map(c => (
              <div 
                key={c.id} onClick={() => openModal(c)}
                className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:border-brand-300 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors">
                    <i className="ph ph-user-focus text-2xl"></i>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-slate-800 uppercase truncate leading-tight">{c.name}</h3>
                    <p className="text-[10px] font-bold text-brand-600 mt-0.5">{c.phone || '(00) 00000-0000'}</p>
                  </div>
                </div>
                
                <div className="space-y-2 border-t border-slate-50 pt-3">
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <i className="ph ph-identification-card"></i>
                    <span>{c.cpf || 'CPF não informado'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <i className="ph ph-map-pin"></i>
                    <span className="truncate">{c.city || 'ALMENARA'}</span>
                  </div>
                  {c.birth_date && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <i className="ph ph-cake"></i>
                      <span>{new Date(c.birth_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}
                </div>

                {/* Status Indicator */}
                <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Extended Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                  <i className="ph ph-user-circle text-2xl"></i>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">{editingCustomer ? 'Perfil do Cliente' : 'Novo Cliente Profissional'}</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Base Estratégica CRM</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
                <i className="ph ph-x text-2xl"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 overflow-y-auto custom-scrollbar space-y-6">
              {/* Seção 1: Identificação */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-3 bg-brand-500 rounded-full"></div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dados de Identificação</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8 space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 text-brand-600">Nome Completo *</label>
                    <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="NOME DO CLIENTE" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-brand-500 transition-all uppercase" />
                  </div>
                  <div className="md:col-span-4 space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 text-brand-600">Telefone / WhatsApp *</label>
                    <input type="text" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-brand-500 transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">CPF</label>
                    <input type="text" value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">RG</label>
                    <input type="text" value={rg} onChange={e => setRg(e.target.value)} placeholder="Opcional" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data Nascimento</label>
                    <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 transition-all" />
                  </div>
                </div>
              </section>

              {/* Seção 2: Localidade e Origem */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-3 bg-brand-500 rounded-full"></div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Localidade e Origem</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Naturalidade (Onde nasceu?)</label>
                    <input type="text" value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Ex: Almenara / MG" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 transition-all uppercase" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cidade Atual (Onde mora?)</label>
                    <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Ex: Almenara" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 transition-all uppercase" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Endereço Residencial</label>
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua, Número, Bairro..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 transition-all uppercase" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-mail de Contato</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@email.com" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 transition-all" />
                  </div>
                </div>
              </section>

              {/* Seção 3: Observações de Perfil */}
              <section className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-3 bg-brand-500 rounded-full"></div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Perfil e Notas Estratégicas</h3>
                </div>
                <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anote aqui preferências do cliente, comportamento de compra ou detalhes para um atendimento personalizado..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 outline-none focus:border-brand-500 transition-all resize-none shadow-inner" />
              </section>

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 border-2 border-slate-100 text-slate-400 font-bold rounded-2xl hover:bg-slate-50 transition-all uppercase text-[10px] tracking-widest">Descartar</button>
                <button type="submit" className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black shadow-xl transition-all uppercase text-[11px] tracking-[0.2em]">Salvar Perfil Estratégico</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;