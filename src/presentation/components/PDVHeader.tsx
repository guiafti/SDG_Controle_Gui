import React from 'react';

interface PDVHeaderProps {
  loja: string;
  vendedor: string;
  onGoToAdmin: () => void;
  onLogout: () => void;
}

const PDVHeader: React.FC<PDVHeaderProps> = ({ loja, vendedor, onGoToAdmin, onLogout }) => {
  return (
    <header className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0 shadow-md">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500 p-2 rounded-lg text-white">
            <i className="ph ph-shopping-cart text-2xl"></i>
          </div>
          <div>
            <h2 className="text-xl font-black tracking-wider text-brand-400">CAIXA ABERTO</h2>
            <p className="text-xs text-slate-400 font-medium tracking-widest">SISTEMA DE VENDAS</p>
          </div>
        </div>
        
        <div className="h-8 w-px bg-slate-700 mx-2"></div>
        
        <div className="flex gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Loja Logada</span>
            <span id="display-loja" className="text-sm font-bold text-slate-200">{loja || '--'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Operador</span>
            <span id="display-vendedor" className="text-sm font-bold text-slate-200">{vendedor || '--'}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button onClick={onGoToAdmin} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-700">
          Ir para Retaguarda
        </button>
        <button onClick={onLogout} className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
          <i className="ph ph-power text-lg"></i>
          Encerrar Turno
        </button>
      </div>
    </header>
  );
};

export default PDVHeader;