import React from 'react';

interface PDVHeaderProps {
  loja: string;
  vendedor: string;
  onGoToAdmin: () => void;
  onLogout: () => void;
  logo?: string;
}

const PDVHeader: React.FC<PDVHeaderProps> = ({ loja, vendedor, onGoToAdmin, onLogout, logo }) => {
  return (
    <header className="bg-slate-900 text-white px-4 py-2 flex justify-between items-center shrink-0 shadow-md">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="bg-brand-500 p-1.5 rounded-lg text-white flex items-center justify-center">
            {logo ? (
              <img src={logo} alt="Logo" className="w-5 h-5 object-contain" />
            ) : (
              <i className="ph ph-shopping-cart text-lg"></i>
            )}
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white leading-tight uppercase">Caixa Aberto</h2>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Terminal de Vendas</p>
          </div>
        </div>
        
        <div className="h-6 w-px bg-slate-700/50 mx-1"></div>
        
        <div className="flex gap-4">
          <div className="flex flex-col">
            <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">Loja</span>
            <span className="text-xs font-bold text-slate-300">{loja || '--'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">Operador</span>
            <span className="text-xs font-bold text-slate-300">{vendedor || '--'}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button onClick={onGoToAdmin} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold transition-all border border-slate-700 uppercase tracking-wider">
          Retaguarda
        </button>
        <button onClick={onLogout} className="px-3 py-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all uppercase tracking-wider">
          <i className="ph ph-power text-sm"></i>
          Sair
        </button>
      </div>
    </header>
  );
};

export default PDVHeader;