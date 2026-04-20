import React from 'react';

interface TitleBarProps {
  logo?: string;
}

const TitleBar: React.FC<TitleBarProps> = ({ logo }) => {
  return (
    <div 
      className="h-10 w-full bg-slate-900 flex items-center justify-between px-4 select-none shrink-0 border-b border-slate-800 z-[999] relative" 
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <div className="flex items-center gap-2 text-slate-400">
        {logo ? (
          <img src={logo} alt="Logo" className="h-6 w-auto object-contain" />
        ) : (
          <i className="ph ph-storefront text-brand-500 text-lg"></i>
        )}
        <span className="text-xs font-bold uppercase tracking-widest ml-1">Grupo Import - PDV Offline</span>
      </div>
      
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button 
          onClick={() => window.api.minimizeWindow()} 
          className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Minimizar"
        >
          <i className="ph ph-minus"></i>
        </button>
        <button 
          onClick={() => window.api.maximizeWindow()} 
          className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Maximizar / Restaurar"
        >
          <i className="ph ph-square"></i>
        </button>
        <button 
          onClick={() => window.api.closeWindow()} 
          className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500 rounded transition-colors"
          title="Fechar Sistema"
        >
          <i className="ph ph-x"></i>
        </button>
      </div>
    </div>
  );
};

export default TitleBar;