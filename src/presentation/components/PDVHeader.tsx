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
    <header className="bg-slate-900 text-white px-6 py-3 flex justify-between items-center shrink-0 shadow-lg">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500 p-2 rounded-lg text-white flex items-center justify-center min-w-[36px] min-h-[36px]">
            {logo ? (
              <img src={logo} alt="Logo" className="w-7 h-7 object-contain" />
            ) : (
              <i className="ph ph-shopping-cart text-xl"></i>
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-brand-400 leading-tight">CAIXA ABERTO</h2>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Sistema de Vendas</p>
          </div>
        </div>
        
        <div className="h-6 w-px bg-slate-700 mx-1"></div>
        
        <div className="flex gap-5">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Loja</span>
            <span id="display-loja" className="text-sm font-bold text-slate-200">{loja || '--'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Operador</span>
            <span id="display-vendedor" className="text-sm font-bold text-slate-200">{vendedor || '--'}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button onClick={onGoToAdmin} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition-all border border-slate-700">
          Retaguarda
        </button>
        <button onClick={onLogout} className="px-4 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 rounded-lg text-xs font-bold flex items-center gap-2 transition-all">
          <i className="ph ph-power text-lg"></i>
          Encerrar
        </button>
      </div>
    </header>
  );
};

export default PDVHeader;