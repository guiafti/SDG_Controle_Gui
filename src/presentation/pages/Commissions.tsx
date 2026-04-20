import React from 'react';

const Commissions: React.FC = () => {
  return (
    <section id="view-comissoes" className="view-section active p-8 max-w-7xl mx-auto w-full">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Relatório de Comissões</h3>
        <p className="text-slate-500">Nesta tela o gerente visualiza as comissões apuradas geradas a partir das vendas feitas no PDV.</p>
      </div>
    </section>
  );
};

export default Commissions;