import React, { useState, useEffect } from 'react';

const Users: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const [formName, setFormName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('vendedor');

  const fetchUsers = async () => {
    try {
      const data = await window.api.getUsers();
      setUsers(data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openModal = (u: any = null) => {
    setEditingUser(u);
    setFormName(u?.name || '');
    setFormPassword(u?.password || '');
    setFormRole(u?.role || 'vendedor');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPassword) return alert('PREENCHA TUDO!');

    try {
      const result = await window.api.saveUser({
        id: editingUser?.id || null,
        name: formName,
        password: formPassword,
        role: formRole
      });
      if (result.success) {
        setIsModalOpen(false);
        fetchUsers();
      }
    } catch (e) { alert('ERRO AO SALVAR'); }
  };

  return (
    <section className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">Gestão de Equipe</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Cadastrar Vendedores e Operadores</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-brand-600 text-white px-10 py-5 rounded-[20px] font-black flex items-center gap-3 hover:bg-brand-700 shadow-2xl shadow-brand-500/40 active:scale-95 transition-all"
        >
          <i className="ph ph-user-plus text-2xl"></i>
          NOVO VENDEDOR
        </button>
      </div>

      <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest">
              <th className="px-8 py-6">Nome do Operador</th>
              <th className="px-8 py-6">Cargo / Nível</th>
              <th className="px-8 py-6 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5 font-black text-slate-800 uppercase tracking-tight">{u.name}</td>
                <td className="px-8 py-5">
                  <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <button 
                    onClick={() => openModal(u)}
                    className="p-4 bg-slate-100 text-slate-400 hover:bg-brand-500 hover:text-white rounded-2xl transition-all"
                  >
                    <i className="ph ph-pencil-simple text-2xl"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-brand-600 p-8 text-white">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">Credenciais de Acesso</h3>
            </div>
            <form onSubmit={handleSave} className="p-10 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nome Completo</label>
                <input value={formName} onChange={e => setFormName(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black" placeholder="NOME DO VENDEDOR" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Senha de Acesso</label>
                <input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black" placeholder="****" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nível de Acesso</label>
                <select value={formRole} onChange={e => setFormRole(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black">
                  <option value="vendedor">VENDEDOR OPERADOR</option>
                  <option value="admin">ADMINISTRADOR / GERENTE</option>
                </select>
              </div>
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 font-black text-slate-400 uppercase text-xs">Cancelar</button>
                <button type="submit" className="flex-[2] py-5 bg-emerald-500 text-white font-black rounded-2xl">GRAVAR ACESSO</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Users;