import React, { useState, useEffect } from 'react';

const Inventory: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const [formName, setFormName] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formPrice, setFormPrice] = useState('');

  const fetchProducts = async () => {
    try {
      const data = await window.api.getAllProducts();
      setProducts(data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const openModal = (p: any = null) => {
    setEditingProduct(p);
    setFormName(p?.name || '');
    setFormBarcode(p?.barcode || '');
    setFormPrice(p?.price?.toString() || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formName || !formBarcode || !formPrice) {
      alert('POR FAVOR, PREENCHA TODOS OS CAMPOS!');
      return;
    }

    const productData = {
      id: editingProduct?.id || null,
      name: formName,
      barcode: formBarcode,
      price: formPrice, // O Main tratará a conversão para Number
    };

    try {
      const result = await window.api.saveManualProduct(productData);
      
      if (result.success) {
        alert('✅ PRODUTO SALVO COM SUCESSO!');
        setIsModalOpen(false);
        fetchProducts();
      } else {
        alert(`❌ ERRO NO BANCO: ${result.error || 'Falha desconhecida'}`);
      }
    } catch (error) {
      console.error('Erro de comunicação:', error);
      alert('🚨 ERRO CRÍTICO: Falha na comunicação com o Processo Principal.');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full font-sans">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic">ESTOQUE MULTILOJA</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Painel de Controle de Inventário</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-brand-600 text-white px-10 py-5 rounded-[20px] font-black flex items-center gap-3 hover:bg-brand-700 shadow-2xl shadow-brand-500/40 active:scale-95 transition-all"
        >
          <i className="ph ph-plus-circle text-2xl"></i>
          NOVO ACESSÓRIO
        </button>
      </div>

      <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Descrição do Produto</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Código</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Preço Venda</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center bg-blue-500">Loja A</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center bg-orange-500">Loja B</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center bg-emerald-500">Loja C</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-5 font-black text-slate-800 text-lg uppercase tracking-tight">{p.name}</td>
                  <td className="px-6 py-5 text-slate-400 font-mono font-bold">{p.barcode}</td>
                  <td className="px-6 py-5 font-black text-brand-600 text-xl">
                    {Number(p.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-6 py-5 text-center font-black text-blue-600 bg-blue-50/30 text-xl border-x border-white">{p.stock_1}</td>
                  <td className="px-6 py-5 text-center font-black text-orange-600 bg-orange-50/30 text-xl border-x border-white">{p.stock_2}</td>
                  <td className="px-6 py-5 text-center font-black text-emerald-600 bg-emerald-50/30 text-xl border-x border-white">{p.stock_3}</td>
                  <td className="px-6 py-5 text-right">
                    <button 
                      onClick={() => openModal(p)}
                      className="p-4 bg-slate-100 text-slate-400 hover:bg-brand-500 hover:text-white rounded-2xl transition-all active:scale-90"
                    >
                      <i className="ph ph-pencil-simple-line text-2xl"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden transform animate-in fade-in zoom-in duration-200">
            <div className="bg-brand-600 p-8 text-white">
              <h3 className="text-2xl font-black uppercase tracking-tighter italic">
                {editingProduct ? 'Editar Informações' : 'Cadastro de Acessório'}
              </h3>
              <p className="text-brand-100 text-xs font-bold uppercase tracking-widest mt-1 opacity-70">Preencha o protocolo de entrada</p>
            </div>
            
            <form onSubmit={handleSave} className="p-10 space-y-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Nome Comercial do Produto</label>
                <input 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="EX: CAPA MAGSAFE IPHONE 15"
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-brand-500 font-black text-slate-700 transition-all uppercase" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Código de Barras (EAN)</label>
                  <input 
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="0000000000000"
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-brand-500 font-mono font-black text-lg" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Preço Unitário (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="0,00"
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-brand-500 font-black text-brand-600 text-xl" 
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 py-5 font-black text-slate-300 hover:text-slate-500 transition-colors uppercase text-xs"
                >
                  Cancelar Operação
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] py-5 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 shadow-2xl shadow-emerald-500/40 transition-all active:scale-95"
                >
                  GRAVAR PROTOCOLO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;