import React from 'react';

interface SidebarProps {
  activeView: string;
  onSwitchView: (view: string) => void;
  onOpenPDV: () => void;
  logo?: string;
  role?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onSwitchView, onOpenPDV, logo, role }) => {
  return (
    <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col shadow-[10px_0_40px_rgba(0,0,0,0.2)] z-20 relative">
      <div className="p-8 border-b border-white/5 flex items-center gap-4 bg-white/5">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
          {logo ? (
            <img src={logo} alt="Logo" className="w-10 h-10 object-contain" />
          ) : (
            <i className="ph ph-lightning text-3xl text-brand-400"></i>
          )}
        </div>
        <div>
          <h1 className="text-white font-black text-xl leading-none tracking-tighter italic uppercase">SDG CONTROL</h1>
          <span className="text-[10px] text-brand-400 font-black uppercase tracking-[0.2em] mt-1 block">Enterprise v2.0</span>
        </div>
      </div>

      <nav className="flex-1 py-8 flex flex-col gap-1.5 px-6 custom-scrollbar overflow-y-auto">
        <button 
          onClick={onOpenPDV}
          className="nav-btn w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-emerald-500 text-white font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 mb-6 group active:scale-95"
        >
          <i className="ph ph-desktop-tower text-2xl group-hover:rotate-12 transition-transform"></i>
          <span className="uppercase text-xs tracking-widest">Abrir Caixa</span>
        </button>

        <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 ml-2">Monitoramento</div>
        
        <button 
          onClick={() => onSwitchView('dashboard')}
          className={`nav-btn w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === 'dashboard' ? 'bg-white/10 text-white shadow-inner border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <i className="ph ph-chart-pie-slice text-2xl"></i>
          Dashboard
        </button>

        <button 
          onClick={() => onSwitchView('inventory')}
          className={`nav-btn w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === 'inventory' ? 'bg-white/10 text-white shadow-inner border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <i className="ph ph-cube text-2xl"></i>
          Inteligência Estoque
        </button>

        <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-6 mb-2 ml-2">Operacional</div>

        <button 
          onClick={() => onSwitchView('repairs')}
          className={`nav-btn w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === 'repairs' ? 'bg-white/10 text-white shadow-inner border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <i className="ph ph-wrench text-2xl"></i>
          Assistência
        </button>

        <button 
          onClick={() => onSwitchView('financeiro')}
          className={`nav-btn w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === 'financeiro' ? 'bg-white/10 text-white shadow-inner border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <i className="ph ph-bank text-2xl"></i>
          Controle Financeiro
        </button>
        
        {role === 'admin' && (
          <>
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-6 mb-2 ml-2">Gestão</div>

            <button 
              onClick={() => onSwitchView('comissoes')}
              className={`nav-btn w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === 'comissoes' ? 'bg-white/10 text-white shadow-inner border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <i className="ph ph-hand-coins text-2xl"></i>
              Comissões
            </button>

            <button 
              onClick={() => onSwitchView('users')}
              className={`nav-btn w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === 'users' ? 'bg-white/10 text-white shadow-inner border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <i className="ph ph-users-three text-2xl"></i>
              Equipe
            </button>

            <button 
              onClick={() => onSwitchView('stores')}
              className={`nav-btn w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === 'stores' ? 'bg-white/10 text-white shadow-inner border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <i className="ph ph-buildings text-2xl"></i>
              Lojas
            </button>

            <button 
              onClick={() => onSwitchView('settings')}
              className={`nav-btn w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all mt-auto border-2 ${activeView === 'settings' ? 'bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-500/20' : 'text-slate-500 border-white/5 hover:border-white/10 hover:text-white'}`}
            >
              <i className="ph ph-sliders text-2xl"></i>
              Personalização
            </button>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;