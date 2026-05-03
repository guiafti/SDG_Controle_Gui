import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const NetworkManagement: React.FC = () => {
  const [stores, setStores] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>('stores');

  // Modals
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Form states
  const [storeName, setStoreName] = useState('');
  const [userName, setUserName] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('vendedor');
  const [showArchivedStores, setShowArchivedStores] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sData, uData, cData] = await Promise.all([
        window.api.getStores(true),
        window.api.getUsers(),
        window.api.getCommissions()
      ]);
      setStores(sData || []);
      setUsers(uData || []);
      setCommissions(cData || []);
    } catch (e) {
      toast.error('Erro ao carregar dados da rede');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- Handlers: Stores ---
  const openStoreModal = (s: any = null) => {
    setEditingStore(s);
    setStoreName(s?.name || '');
    setIsStoreModalOpen(true);
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) return toast.error('NOME OBRIGATÓRIO');
    const loadingId = toast.loading('Salvando unidade...');
    try {
      const res = await window.api.saveStore({ id: editingStore?.id, name: storeName });
      if (res.success) {
        toast.success('UNIDADE ATUALIZADA', { id: loadingId });
        setIsStoreModalOpen(false);
        fetchData();
      }
    } catch (e) { toast.error('ERRO DE COMUNICAÇÃO', { id: loadingId }); }
  };

  const handleArchiveStore = async (store: any) => {
    const action = store.archived ? 'restaurar' : 'arquivar';
    toast((t) => (
      <div className="flex flex-col gap-3 p-1">
        <p className="text-xs font-bold text-slate-800 uppercase">Deseja realmente {action} a loja "{store.name}"?</p>
        <div className="flex gap-2">
          <button onClick={async () => {
            toast.dismiss(t.id);
            const res = await window.api.archiveStore({ id: store.id, archived: !store.archived });
            if (res.success) { toast.success('OPERADO COM SUCESSO'); fetchData(); }
          }} className="flex-1 bg-brand-500 text-white py-2 rounded-lg font-bold text-[10px] uppercase">Sim</button>
          <button onClick={() => toast.dismiss(t.id)} className="flex-1 bg-slate-100 text-slate-500 py-2 rounded-lg font-bold text-[10px] uppercase">Não</button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  // --- Handlers: Users ---
  const openUserModal = (u: any = null) => {
    setEditingUser(u);
    setUserName(u?.name || '');
    setUserPassword(u?.password || '');
    setUserRole(u?.role || 'vendedor');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userPassword) return toast.error('PREENCHA TUDO');
    try {
      const res = await window.api.saveUser({ id: editingUser?.id, name: userName, password: userPassword, role: userRole });
      if (res.success) {
        toast.success('EQUIPE ATUALIZADA');
        setIsUserModalOpen(false);
        fetchData();
      }
    } catch (e) { toast.error('ERRO AO SALVAR'); }
  };

  const filteredStores = stores.filter(s => showArchivedStores ? s.archived === 1 : s.archived === 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden animate-in fade-in duration-500">
      <main className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar pb-20">
        
        {/* Header Estratégico */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Gestão de Rede Profissional</h1>
            <p className="text-slate-500 font-medium text-xs mt-0.5 uppercase tracking-widest">Controle Centralizado de Lojas, Equipes e Resultados</p>
          </div>
        </div>

        {/* Section 1: Lojas e Unidades */}
        <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 ${expandedSection === 'stores' ? 'flex-1' : 'h-auto'}`}>
          <div 
            onClick={() => setExpandedSection(expandedSection === 'stores' ? null : 'stores')}
            className="p-4 px-6 flex justify-between items-center cursor-pointer hover:bg-slate-50/50 transition-colors border-b border-slate-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 shadow-sm"><i className="ph ph-buildings text-2xl"></i></div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase italic">Unidades Operacionais</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{stores.filter(s => !s.archived).length} Lojas Ativas na Rede</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
               <button onClick={(e) => { e.stopPropagation(); openStoreModal(); }} className="px-3 py-1.5 bg-brand-500 text-white rounded-lg text-[9px] font-black uppercase hover:bg-brand-600 transition-all shadow-md">+ Nova Loja</button>
               <i className="ph ph-caret-down text-slate-400 transition-transform" style={{ transform: expandedSection === 'stores' ? 'rotate(180deg)' : 'rotate(0deg)' }}></i>
            </div>
          </div>
          
          {expandedSection === 'stores' && (
            <div className="p-4 space-y-2 animate-in slide-in-from-top-2 duration-300">
               <div className="flex justify-end mb-2">
                  <button onClick={() => setShowArchivedStores(!showArchivedStores)} className="text-[8px] font-black text-slate-400 uppercase underline">{showArchivedStores ? 'Ver Ativas' : 'Ver Arquivadas'}</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                 {filteredStores.map(s => (
                   <div key={s.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between group hover:border-brand-300 transition-all">
                      <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.archived ? 'bg-slate-100 text-slate-300' : 'bg-white text-brand-500 shadow-sm'}`}><i className="ph ph-storefront"></i></div>
                         <span className={`text-xs font-bold uppercase ${s.archived ? 'text-slate-300 line-through' : 'text-slate-700'}`}>{s.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openStoreModal(s)} className="p-1.5 text-slate-400 hover:text-brand-600"><i className="ph ph-pencil-simple"></i></button>
                        <button onClick={() => handleArchiveStore(s)} className={`p-1.5 ${s.archived ? 'text-emerald-500' : 'text-red-400'}`}><i className={`ph ${s.archived ? 'ph-arrow-u-up-left' : 'ph-archive'}`}></i></button>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>

        {/* Section 2: Equipe e Operadores */}
        <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 ${expandedSection === 'users' ? 'flex-1' : 'h-auto'}`}>
          <div 
            onClick={() => setExpandedSection(expandedSection === 'users' ? null : 'users')}
            className="p-4 px-6 flex justify-between items-center cursor-pointer hover:bg-slate-50/50 transition-colors border-b border-slate-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 shadow-sm"><i className="ph ph-users-three text-2xl"></i></div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase italic">Equipe e Vendedores</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{users.length} Colaboradores Cadastrados</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
               <button onClick={(e) => { e.stopPropagation(); openUserModal(); }} className="px-3 py-1.5 bg-brand-500 text-white rounded-lg text-[9px] font-black uppercase hover:bg-brand-600 transition-all shadow-md">+ Novo Membro</button>
               <i className="ph ph-caret-down text-slate-400 transition-transform" style={{ transform: expandedSection === 'users' ? 'rotate(180deg)' : 'rotate(0deg)' }}></i>
            </div>
          </div>

          {expandedSection === 'users' && (
            <div className="p-4 animate-in slide-in-from-top-2 duration-300">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 {users.map(u => (
                   <div key={u.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-brand-500 transition-all flex flex-col gap-3 relative overflow-hidden">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs">{u.name.charAt(0)}</div>
                         <div className="min-w-0">
                           <p className="text-xs font-bold text-slate-800 uppercase truncate">{u.name}</p>
                           <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>{u.role}</span>
                         </div>
                      </div>
                      <button onClick={() => openUserModal(u)} className="w-full py-1.5 bg-slate-50 text-slate-400 hover:bg-brand-500 hover:text-white rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1.5">
                        <i className="ph ph-lock-key"></i> Alterar Acesso
                      </button>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>

        {/* Section 3: Acerto de Comissões */}
        <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 ${expandedSection === 'commissions' ? 'flex-1' : 'h-auto'}`}>
          <div 
            onClick={() => setExpandedSection(expandedSection === 'commissions' ? null : 'commissions')}
            className="p-4 px-6 flex justify-between items-center cursor-pointer hover:bg-slate-50/50 transition-colors border-b border-slate-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 shadow-sm"><i className="ph ph-hand-coins text-2xl"></i></div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase italic">Acerto de Comissões</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Relatório Financeiro de Desempenho</p>
              </div>
            </div>
            <i className="ph ph-caret-down text-slate-400 transition-transform" style={{ transform: expandedSection === 'commissions' ? 'rotate(180deg)' : 'rotate(0deg)' }}></i>
          </div>

          {expandedSection === 'commissions' && (
            <div className="p-0 animate-in slide-in-from-top-2 duration-300 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-3">Data</th>
                    <th className="px-6 py-3">Vendedor</th>
                    <th className="px-6 py-3">Referência</th>
                    <th className="px-6 py-3 text-right">Comissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {commissions.length === 0 ? (
                    <tr><td colSpan={4} className="py-10 text-center text-slate-300 font-bold uppercase text-[10px]">Sem dados para o período</td></tr>
                  ) : commissions.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 text-[10px] text-slate-500 font-medium">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-3 text-xs font-bold text-slate-700 uppercase">{c.vendedor}</td>
                      <td className="px-6 py-3 text-[10px] font-mono text-slate-400">ID: {c.sale_id.substring(0,8)}</td>
                      <td className="px-6 py-3 text-right font-mono font-bold text-brand-600 text-xs">R$ {c.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* Store Modal */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in duration-200">
            <div className="p-5 bg-brand-500 text-white flex justify-between items-center">
               <h3 className="font-black uppercase italic text-lg">{editingStore ? 'Editar Unidade' : 'Nova Loja'}</h3>
               <button onClick={() => setIsStoreModalOpen(false)}><i className="ph ph-x text-2xl"></i></button>
            </div>
            <form onSubmit={handleSaveStore} className="p-8 space-y-6">
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Comercial</label>
                  <input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="EX: LOJA MATRIZ" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold uppercase text-slate-700 outline-none focus:border-brand-500" />
               </div>
               <button type="submit" className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-black uppercase text-xs tracking-widest">Gravar Unidade</button>
            </form>
          </div>
        </div>
      )}

      {/* User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in duration-200">
            <div className="p-5 bg-brand-500 text-white flex justify-between items-center">
               <h3 className="font-black uppercase italic text-lg">{editingUser ? 'Editar Acesso' : 'Novo Vendedor'}</h3>
               <button onClick={() => setIsUserModalOpen(false)}><i className="ph ph-x text-2xl"></i></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-8 space-y-4">
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Operador</label>
                  <input value={userName} onChange={e => setUserName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-xs" />
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha de Acesso</label>
                  <input type="password" value={userPassword} onChange={e => setUserPassword(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs" />
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo / Nível</label>
                  <select value={userRole} onChange={e => setUserRole(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-xs">
                    <option value="vendedor">Vendedor Operador</option>
                    <option value="admin">Gerente Administrador</option>
                  </select>
               </div>
               <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px]">Cancelar</button>
                  <button type="submit" className="flex-[2] py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl uppercase text-xs">Salvar Equipe</button>
               </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default NetworkManagement;