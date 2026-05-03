import React, { useState, useEffect } from 'react';

interface PDVHeaderProps {
  loja: string;
  vendedor: string;
  onGoToAdmin: () => void;
  onLogout: () => void;
  logo?: string;
}

const PDVHeader: React.FC<PDVHeaderProps> = ({ loja, vendedor, onGoToAdmin, onLogout, logo }) => {
  const [time, setTime] = useState(new Date());
  const [reminder, setReminder] = useState('Clique aqui para definir um lembrete para seu turno...');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleEditReminder = () => {
    const newReminder = prompt('Digite seu lembrete:', reminder);
    if (newReminder !== null && newReminder.trim() !== '') {
      setReminder(newReminder);
    }
  };

  return (
    <header className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0 shadow-2xl border-b border-slate-800 relative overflow-hidden">
      {/* Background Accent Decor */}
      <div className="absolute top-0 right-1/4 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2"></div>
      
      {/* Left Section: Time, Weather, and Station Info */}
      <div className="flex items-center gap-8 relative z-10">
        {/* Clock Hub */}
        <div className="flex flex-col border-r border-slate-800 pr-8">
          <div className="text-4xl font-bold text-white tracking-tighter leading-none font-mono flex items-baseline gap-1">
            {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
            <i className="ph ph-calendar-blank text-brand-400"></i>
            {time.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </div>
        </div>

        {/* Weather & Station */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 group cursor-help">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-brand-400 border border-white/10 group-hover:bg-brand-500/10 transition-colors">
              <i className="ph ph-cloud-sun text-3xl"></i>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-slate-100 leading-none">24°C</span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Almenara • MG</span>
            </div>
          </div>

          <div className="h-10 w-px bg-slate-800"></div>

          <div className="flex gap-6">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1">Unidade Operacional</span>
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-lg border border-white/5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <span className="text-xs font-bold text-slate-200 uppercase tracking-tight">{loja || 'LOJA MATRIZ'}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1">Operador Ativo</span>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-100 uppercase tracking-tight">
                <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
                  <i className="ph ph-user text-lg"></i>
                </div>
                {vendedor || 'SISTEMA'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Center Section: dynamic Content (Reminders & Promos) */}
      <div className="hidden xl:flex flex-1 mx-12 items-center gap-4 justify-center relative z-10">
        {/* Promotion Card */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl p-0.5 shadow-lg shadow-brand-500/10 hover:scale-[1.02] transition-transform cursor-pointer group">
          <div className="bg-slate-900 rounded-[14px] px-4 py-2 flex items-center gap-3">
            <div className="bg-brand-500 text-white p-2 rounded-xl shadow-inner group-hover:rotate-12 transition-transform">
              <i className="ph ph-lightning text-xl font-bold"></i>
            </div>
            <div className="min-w-[140px]">
              <p className="text-[8px] font-black text-brand-400 uppercase tracking-widest">Oferta do Dia</p>
              <h4 className="text-[11px] font-bold text-white uppercase truncate">Capa Silicone iPhone</h4>
              <p className="text-[10px] font-black text-emerald-400 font-mono">R$ 49,90</p>
            </div>
          </div>
        </div>

        {/* Reminder Card - Editable */}
        <div 
          onClick={handleEditReminder}
          className="bg-slate-800/40 border border-slate-700/50 rounded-2xl px-5 py-3 flex items-center gap-4 max-w-sm w-full group hover:bg-slate-800 transition-all cursor-pointer border-dashed hover:border-brand-500/50"
        >
          <div className="w-10 h-10 bg-orange-500/10 text-orange-400 rounded-xl flex items-center justify-center border border-orange-500/20 group-hover:rotate-6 transition-transform">
            <i className="ph ph-push-pin text-xl"></i>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5 flex justify-between">
              Notificação Interna
              <span className="text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity text-[7px] uppercase tracking-normal underline">Editar</span>
            </p>
            <p className="text-[10px] text-slate-300 font-medium truncate italic leading-tight">
              "{reminder}"
            </p>
          </div>
        </div>
      </div>
      
      {/* Right Section: Control Actions */}
      <div className="flex items-center gap-3 relative z-10 pl-6 border-l border-slate-800">
        <button onClick={onGoToAdmin} className="group px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 shadow-xl flex items-center gap-3 active:scale-95">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-brand-400 group-hover:text-brand-300 transition-colors">
            <i className="ph ph-chart-line-up text-xl"></i>
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-[10px] font-black text-white uppercase leading-none">Gestão</p>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Retaguarda</p>
          </div>
        </button>
        
        <button onClick={onLogout} className="flex flex-col items-center justify-center w-14 h-14 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl transition-all border border-red-500/20 shadow-lg shadow-red-500/5 active:scale-95 group">
          <i className="ph ph-power text-2xl group-hover:scale-110 transition-transform"></i>
          <span className="text-[7px] font-black uppercase mt-1 tracking-tighter">Sair</span>
        </button>
      </div>
    </header>
  );
};

export default PDVHeader;