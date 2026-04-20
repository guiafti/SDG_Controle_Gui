import React from 'react';

interface SidebarProps {
  activeView: string;
  onSwitchView: (view: string) => void;
  onOpenPDV: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onSwitchView, onOpenPDV }) => {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-20 relative">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <i className="ph ph-storefront text-3xl text-brand-500"></i>
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">Grupo Import</h1>
          <span className="text-xs text-slate-400">Retaguarda Admin</span>
        </div>
      </div>

      <nav className="flex-1 py-6 flex flex-col gap-2 px-4">
        <button 
          onClick={onOpenPDV}
          className="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-500/10 text-emerald-500 font-bold hover:bg-emerald-500 hover:text-white transition-colors border border-emerald-500/20 mb-4"
        >
          <i className="ph ph-desktop-tower text-xl"></i>
          Abrir PDV (Caixa)
        </button>

        <button 
          onClick={() => onSwitchView('dashboard')}
          className={`nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium ${activeView === 'dashboard' ? 'bg-brand-500 text-white' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}
        >
          <i className="ph ph-chart-line-up text-xl"></i>
          Dashboard
        </button>

        <button 
          onClick={() => onSwitchView('inventory')}
          className={`nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium ${activeView === 'inventory' ? 'bg-brand-500 text-white' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}
        >
          <i className="ph ph-package text-xl"></i>
          Estoque / Produtos
        </button>
        
        <button 
          onClick={() => onSwitchView('comissoes')}
          className={`nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium ${activeView === 'comissoes' ? 'bg-brand-500 text-white' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}
        >
          <i className="ph ph-money text-xl"></i>
          Comissões
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;