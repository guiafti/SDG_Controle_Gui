import React from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onLogin: (loja: string, vendedor: string) => void;
  onGoToAdmin: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onLogin, onGoToAdmin }) => {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const loja = formData.get('loja') as string;
    const vendedor = formData.get('vendedor') as string;
    onLogin(loja, vendedor);
  };

  return (
    <div id="modal-setup" className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            <i className="ph ph-lock-key"></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Abertura de Caixa</h2>
          <p className="text-sm text-slate-500 mt-1">Identifique-se para liberar o sistema de vendas.</p>
        </div>

        <form id="form-setup" className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Qual é a Loja atual?</label>
            <select name="loja" required className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 p-3 outline-none">
              <option value="">Selecione...</option>
              <option value="Loja Centro">Loja A (Centro)</option>
              <option value="Loja Avenida">Loja B (Avenida)</option>
              <option value="Loja Shopping">Loja C (Shopping)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Vendedor Operador</label>
            <select name="vendedor" required className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 p-3 outline-none">
              <option value="">Selecione...</option>
              <option value="Carlos Silva">Carlos Silva</option>
              <option value="Ana Beatriz">Ana Beatriz</option>
              <option value="Roberto Alves">Roberto Alves</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Senha de Acesso</label>
            <input type="password" required placeholder="Digite sua senha..." className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 p-3 outline-none" />
            <p className="text-xs text-slate-400 mt-1">*Para este teste, qualquer senha será aceita.</p>
          </div>

          <button type="submit" className="w-full py-4 mt-2 rounded-lg bg-brand-500 text-white font-bold text-lg hover:bg-brand-600 shadow-lg shadow-brand-500/30">
            Desbloquear PDV
          </button>
        </form>
        
        <button onClick={onGoToAdmin} className="w-full text-center mt-4 text-sm text-slate-500 hover:text-slate-800 font-medium">
          Ir para o Retaguarda (Admin)
        </button>
      </div>
    </div>
  );
};

export default LoginModal;