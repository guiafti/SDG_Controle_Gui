import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import TaskCompletionModal from '../components/TaskCompletionModal';

interface NetworkManagementProps {
  currentUser?: { id: string, name: string, role: string };
  currentStoreId?: string;
}

const NetworkManagement: React.FC<NetworkManagementProps> = ({ currentUser, currentStoreId }) => {
  const [stores, setStores] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Non-blocking UI states
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setExpandedSection('missions');
  }, []);

  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [editingStore, setEditingStore] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);

  const [storeName, setStoreName] = useState('');
  const [userName, setUserName] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('vendedor');
  
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssigneeType, setTaskAssigneeType] = useState<'store' | 'user'>('store');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskIsRoutine, setTaskIsRoutine] = useState(false);
  const [taskProofRequired, setTaskProofRequired] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, u, t] = await Promise.all([
        window.api.getStores(true),
        window.api.getUsers(),
        window.api.getTasks()
      ]);
      setStores(s || []);
      setUsers(u || []);
      setTasks(t || []);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  useEffect(() => { 
    fetchData();
    const i = setInterval(fetchData, 30000);
    return () => clearInterval(i);
  }, []);

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskAssigneeId) return toast.error('PREENCHA TUDO');
    const loadingId = toast.loading('Enviando missão...');
    try {
      const res = await window.api.saveTask({ 
        title: taskTitle.toUpperCase(), 
        assignee_type: taskAssigneeType, 
        assignee_id: taskAssigneeId, 
        due_date: taskDueDate, 
        is_routine: taskIsRoutine ? 1 : 0, 
        proof_required: taskProofRequired ? 1 : 0 
      });
      if (res.success) {
        toast.success('COMANDO ENVIADO!', { id: loadingId });
        setIsTaskModalOpen(false); 
        setTaskTitle(''); 
        fetchData();
      } else {
        toast.error('ERRO: ' + (res.error || 'Falha ao salvar'), { id: loadingId });
      }
    } catch (e) { toast.error('ERRO DE CONEXÃO', { id: loadingId }); }
  };

  const handleDeleteTask = async (id: string) => {
    const loadingId = toast.loading('Excluindo missão...');
    try {
      const res = await window.api.deleteTask(id);
      if (res.success) {
        toast.success('MISSÃO EXCLUÍDA', { id: loadingId });
        setConfirmingDeleteId(null);
        fetchData();
      } else {
        toast.error('ERRO AO EXCLUIR', { id: loadingId });
      }
    } catch (e) { toast.error('ERRO DE CONEXÃO', { id: loadingId }); }
  };

  const handleConfirmCompletion = async (data: any) => {
    if (!selectedTask) return;
    const res = await window.api.completeTask(selectedTask.id, data.photo, data.justification);
    if (res.success) { toast.success('OK!'); setSelectedTask(null); fetchData(); }
  };

  const toggleTaskStatus = async (id: string, currentStatus: string) => {
    const res = await window.api.toggleTask(id, currentStatus === 'pending' ? 'completed' : 'pending');
    if (res.success) { toast.success('OK'); fetchData(); }
  };

  const myTasks = tasks.filter(t => {
    if (currentUser?.role === 'admin') return true;
    if (t.status !== 'pending') return false;
    return (t.assignee_type === 'store' && t.assignee_id === currentStoreId) || (t.assignee_id === currentUser?.name);
  });

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) return toast.error('NOME OBRIGATÓRIO');
    const res = await window.api.saveStore({ id: editingStore?.id, name: storeName });
    if (res.success) { toast.success('LOJA SALVA'); setIsStoreModalOpen(false); fetchData(); }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userPassword) return toast.error('PREENCHA TUDO');
    const res = await window.api.saveUser({ id: editingUser?.id, name: userName, password: userPassword, role: userRole });
    if (res.success) { toast.success('OPERADOR SALVO'); setIsUserModalOpen(false); fetchData(); }
  };

  const handleArchiveStore = async (store: any) => {
     const res = await window.api.archiveStore({ id: store.id, archived: !store.archived });
     if (res.success) fetchData();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 animate-in fade-in duration-500 overflow-hidden">
      <main className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        
        {/* TOP: MISSION CONTROL (ADMIN SUMMARY) */}
        {currentUser?.role === 'admin' && (
          <div className="bg-slate-900 rounded-3xl p-6 shadow-2xl relative overflow-hidden border border-slate-800 mb-2">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
               <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight uppercase italic">Hub de Gestão de Rede</h1>
                  <p className="text-brand-400 text-[10px] font-bold uppercase tracking-widest">Controle Profissional de Unidades e Processos</p>
               </div>
               <button 
                 onClick={() => { setEditingUser(null); setIsTaskModalOpen(true); }} 
                 className="bg-brand-500 hover:bg-brand-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-lg shadow-brand-500/20 transition-all active:scale-95"
               >
                 + Atribuir Nova Missão
               </button>
            </div>
          </div>
        )}

        {/* SECTION: MISSIONS LIST (Always Visible) */}
        <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-4 ${expandedSection === 'missions' ? 'h-auto' : 'h-[72px]'}`}>
          <div onClick={() => setExpandedSection(expandedSection === 'missions' ? null : 'missions')} className="p-4 px-6 flex justify-between items-center cursor-pointer bg-slate-50/50 border-b border-slate-50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-brand-400 shadow-sm"><i className="ph ph-shield-check text-2xl"></i></div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase italic">Painel de Comandos e Processos</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{myTasks.length} Tarefas Aguardando</p>
              </div>
            </div>
            <i className={`ph ph-caret-down text-slate-400 transition-transform ${expandedSection === 'missions' ? 'rotate-180' : ''}`}></i>
          </div>
          {expandedSection === 'missions' && (
            <div className="p-4 space-y-2 animate-in slide-in-from-top-1">
               {myTasks.length === 0 ? <p className="text-center py-10 text-slate-300 font-bold uppercase text-[10px]">Operação em dia na sua estação</p> : myTasks.map(t => (
                 <div key={t.id} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${t.status === 'completed' ? 'opacity-40 bg-slate-50' : 'bg-white border-slate-200 hover:border-brand-500 shadow-sm'}`}>
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2">
                          <p className="text-sm font-bold uppercase text-slate-800 truncate">{t.title}</p>
                          {t.is_routine === 1 && <span className="text-[7px] font-black bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">DIÁRIO</span>}
                          {t.proof_required === 1 && <span className="text-[7px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">FOTO</span>}
                       </div>
                       <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 italic">Prazo: {t.due_date || 'Imediato'}</p>
                       {t.justification && <p className="text-[9px] text-orange-600 font-medium italic mt-2">Justificativa: "{t.justification}"</p>}
                    </div>
                    <div className="flex gap-2">
                      {currentUser?.role === 'admin' && (
                        confirmingDeleteId === t.id ? (
                          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                            <button onClick={(e) => { e.stopPropagation(); setConfirmingDeleteId(null); }} className="px-3 py-1.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase rounded-lg">Cancelar</button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(t.id); }} className="px-3 py-1.5 bg-red-500 text-white text-[8px] font-black uppercase rounded-lg shadow-lg">Apagar</button>
                          </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); setConfirmingDeleteId(t.id); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><i className="ph ph-trash text-xl"></i></button>
                        )
                      )}
                      <button onClick={() => t.status === 'pending' ? setSelectedTask(t) : toggleTaskStatus(t.id, t.status)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${t.status === 'completed' ? 'bg-slate-200 text-slate-500' : 'bg-brand-500 text-white shadow-lg shadow-brand-500/10'}`}>
                        {t.status === 'completed' ? 'REABRIR' : 'OK'}
                      </button>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>

        {/* SECTION: MANAGEMENT (ADMIN ONLY) */}
        {currentUser?.role === 'admin' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lojas */}
            <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all ${expandedSection === 'stores' ? 'h-auto' : 'h-[72px]'}`}>
              <div onClick={() => setExpandedSection(expandedSection === 'stores' ? null : 'stores')} className="p-4 px-6 flex justify-between items-center cursor-pointer bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 shadow-sm"><i className="ph ph-buildings text-2xl"></i></div>
                  <h3 className="text-xs font-black text-slate-800 uppercase italic">Unidades</h3>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setEditingStore(null); setStoreName(''); setIsStoreModalOpen(true); }} className="p-2 text-brand-500 hover:bg-brand-50 rounded-lg"><i className="ph ph-plus-circle text-2xl"></i></button>
              </div>
              {expandedSection === 'stores' && (
                <div className="p-4 space-y-2">
                   {stores.map(s => (
                     <div key={s.id} className={`p-3 bg-slate-50 border rounded-xl flex justify-between items-center transition-all ${s.archived ? 'opacity-40 grayscale' : 'hover:border-brand-300'}`}>
                        <span className="text-xs font-bold uppercase">{s.name}</span>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingStore(s); setStoreName(s.name); setIsStoreModalOpen(true); }} className="p-1 text-slate-400 hover:text-brand-600"><i className="ph ph-pencil-simple"></i></button>
                          <button onClick={() => handleArchiveStore(s)} className={`p-1 ${s.archived ? 'text-emerald-500' : 'text-red-400'}`}><i className="ph ph-archive"></i></button>
                        </div>
                     </div>
                   ))}
                </div>
              )}
            </div>

            {/* Equipe */}
            <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all ${expandedSection === 'users' ? 'h-auto' : 'h-[72px]'}`}>
              <div onClick={() => setExpandedSection(expandedSection === 'users' ? null : 'users')} className="p-4 px-6 flex justify-between items-center cursor-pointer bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 shadow-sm"><i className="ph ph-users-three text-2xl"></i></div>
                  <h3 className="text-xs font-black text-slate-800 uppercase italic">Equipe</h3>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setEditingUser(null); setUserName(''); setUserPassword(''); setUserRole('vendedor'); setIsUserModalOpen(true); }} className="p-2 text-brand-500 hover:bg-brand-50 rounded-lg"><i className="ph ph-plus-circle text-2xl"></i></button>
              </div>
              {expandedSection === 'users' && (
                <div className="p-4 space-y-2">
                   {users.map(u => (
                     <div key={u.id} className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center">
                        <span className="text-xs font-bold uppercase">{u.name}</span>
                        <button onClick={() => { setEditingUser(u); setUserName(u.name); setUserPassword(u.password); setUserRole(u.role); setIsUserModalOpen(true); }} className="p-1 text-slate-400 hover:text-brand-600"><i className="ph ph-pencil-simple"></i></button>
                     </div>
                   ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MISSION MODAL */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
               <h3 className="font-black uppercase italic tracking-tight text-lg">Definir Missão</h3>
               <button onClick={() => setIsTaskModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center"><i className="ph ph-x text-2xl"></i></button>
            </div>
            <form onSubmit={handleSaveTask} className="p-8 space-y-5">
               <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="O QUE DEVE SER FEITO? *" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold uppercase outline-none focus:border-brand-500" />
               <div className="grid grid-cols-2 gap-4">
                  <select value={taskAssigneeType} onChange={e => setTaskAssigneeType(e.target.value as any)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs uppercase outline-none">
                    <option value="store">P/ TODA A LOJA</option><option value="user">P/ VENDEDOR ESPECÍFICO</option>
                  </select>
                  <input value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} placeholder="HORÁRIO (Ex: 15:00)" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none" />
               </div>
               <div className="flex gap-4">
                  <label className="flex-1 flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:bg-white transition-colors">
                    <input type="checkbox" checked={taskIsRoutine} onChange={e => setTaskIsRoutine(e.target.checked)} className="w-4 h-4 rounded text-brand-500" />
                    <span className="text-[9px] font-black uppercase text-slate-600">Checklist Diário</span>
                  </label>
                  <label className="flex-1 flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:bg-white transition-colors">
                    <input type="checkbox" checked={taskProofRequired} onChange={e => setTaskProofRequired(e.target.checked)} className="w-4 h-4 rounded text-brand-500" />
                    <span className="text-[9px] font-black uppercase text-slate-600">Exigir Foto</span>
                  </label>
               </div>
               <select value={taskAssigneeId} onChange={e => setTaskAssigneeId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-xs outline-none">
                 <option value="">SELECIONE O DESTINATÁRIO... *</option>
                 {taskAssigneeType === 'store' ? stores.filter(s => !s.archived).map(s => <option key={s.id} value={s.id}>{s.name}</option>) : users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
               </select>
               <button type="submit" className="w-full py-4 bg-brand-500 text-white font-black rounded-2xl shadow-xl hover:bg-brand-600 uppercase text-xs transition-all">ATRIBUIR MISSÃO</button>
            </form>
          </div>
        </div>
      )}

      {/* STORE MODAL */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 bg-brand-500 text-white flex justify-between items-center">
               <h3 className="font-black uppercase italic text-lg">{editingStore ? 'Editar Unidade' : 'Nova Loja'}</h3>
               <button onClick={() => setIsStoreModalOpen(false)}><i className="ph ph-x text-2xl"></i></button>
            </div>
            <form onSubmit={handleSaveStore} className="p-8 space-y-6">
               <input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="NOME DA LOJA" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold uppercase text-slate-700 outline-none focus:border-brand-500" />
               <button type="submit" className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-black uppercase text-xs">Gravar Unidade</button>
            </form>
          </div>
        </div>
      )}

      {/* USER MODAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 bg-brand-500 text-white flex justify-between items-center">
               <h3 className="font-black uppercase italic text-lg">{editingUser ? 'Editar Acesso' : 'Novo Vendedor'}</h3>
               <button onClick={() => setIsUserModalOpen(false)}><i className="ph ph-x text-2xl"></i></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-8 space-y-4">
               <input value={userName} onChange={e => setUserName(e.target.value)} placeholder="NOME" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-xs" />
               <input type="password" value={userPassword} onChange={e => setUserPassword(e.target.value)} placeholder="SENHA" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs" />
               <select value={userRole} onChange={e => setUserRole(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-xs">
                 <option value="vendedor">Vendedor Operador</option>
                 <option value="admin">Administrador Gerente</option>
               </select>
               <button type="submit" className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-black uppercase text-xs">Salvar Equipe</button>
            </form>
          </div>
        </div>
      )}

      <TaskCompletionModal isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} onConfirm={handleConfirmCompletion} task={selectedTask} />
    </div>
  );
};

export default NetworkManagement;