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
    } catch (e) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
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
    parseNotes(customer?.notes || '');
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
      <main className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-brand-600 uppercase italic">Gestão de Clientes</h1>
          <button onClick={() => openModal()} className="bg-brand-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm">+ Novo Cliente</button>
        </div>

        <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border rounded-xl py-2.5 px-4 outline-none shadow-sm" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredCustomers.map(c => (
            <div key={c.id} onClick={() => openModal(c)} className="bg-white rounded-2xl border p-5 shadow-sm hover:border-brand-400 transition-all cursor-pointer">
              <h3 className="font-bold uppercase text-slate-800 truncate">{c.name}</h3>
              <p className="text-xs text-brand-600 font-bold mt-1">{c.phone}</p>
              <div className="mt-3 pt-3 border-t border-slate-50 text-[10px] text-slate-400">
                <p>CPF: {c.cpf || 'N/A'}</p>
                <p>CIDADE: {c.city || 'ALMENARA'}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold uppercase italic">Perfil do Cliente</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 text-3xl">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-8 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <section className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1">Identificação</h3>
                    <input required value={name} onChange={e => setName(e.target.value)} placeholder="NOME COMPLETO *" className="w-full p-3 bg-slate-50 border rounded-xl font-bold uppercase text-sm" />
                    <div className="grid grid-cols-2 gap-3">
                      <input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="WHATSAPP *" className="p-3 bg-slate-50 border rounded-xl font-bold text-sm" />
                      <input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="CPF" className="p-3 bg-slate-50 border rounded-xl text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input value={rg} onChange={e => setRg(e.target.value)} placeholder="RG" className="p-3 bg-slate-50 border rounded-xl text-sm" />
                      <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="p-3 bg-slate-50 border rounded-xl text-sm" />
                    </div>
                  </section>
                  <section className="space-y-3">
                    <div className="flex justify-between items-center"><h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1 flex-1">Classificação</h3><button type="button" onClick={addNewTag} className="text-[10px] text-brand-600 font-bold ml-2">NOVA TAG</button></div>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map(tag => (
                        <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black border transition-all ${selectedTags.includes(tag) ? 'bg-slate-900 border-slate-900 text-brand-400' : 'bg-white border-slate-200 text-slate-400'}`}>{tag}</button>
                      ))}
                    </div>
                  </section>
                </div>
                <div className="space-y-6">
                  <section className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1">Localização</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="NATURALIDADE" className="p-3 bg-slate-50 border rounded-xl font-bold uppercase text-xs" />
                      <input value={city} onChange={e => setCity(e.target.value)} placeholder="CIDADE ATUAL" className="p-3 bg-slate-50 border rounded-xl font-bold uppercase text-xs" />
                    </div>
                    <input value={address} onChange={e => setAddress(e.target.value)} placeholder="ENDEREÇO COMPLETO" className="w-full p-3 bg-slate-50 border rounded-xl font-bold uppercase text-xs" />
                  </section>
                  <section className="space-y-3">
                    <div className="flex justify-between items-center"><h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1 flex-1">Família e Preferências</h3><button type="button" onClick={addFamilyMember} className="text-[10px] text-blue-600 font-bold ml-2">+ FAMILIAR</button></div>
                    <div className="space-y-2">
                      {familyMembers.map((m, i) => (
                        <div key={i} className="flex gap-2"><input placeholder="Nome" value={m.name} onChange={e => updateFamily(i, 'name', e.target.value)} className="flex-1 p-2 bg-slate-50 border rounded-lg text-xs uppercase" /><button type="button" onClick={() => removeFamily(i)} className="text-red-400">&times;</button></div>
                      ))}
                    </div>
                  </section>
                  <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="NOTAS ESTRATÉGICAS..." className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:border-brand-500" />
                </div>
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 border rounded-2xl font-bold uppercase text-xs">Descartar</button>
                <button type="submit" className="flex-[2] py-4 bg-brand-500 text-white font-bold rounded-2xl shadow-xl uppercase text-xs">Gravar Perfil</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;