import React, { useState, useEffect } from 'react';

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (barcode: string) => void;
}

const ProductSearchModal: React.FC<ProductSearchModalProps> = ({ isOpen, onClose, onSelectProduct }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      fetchProducts();
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      const data = await window.api.getAllProducts();
      setProducts(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.barcode.includes(searchTerm)
  );

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 pt-14">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-brand-600 p-6 text-white shrink-0 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tighter italic">Pesquisa Manual</h3>
            <p className="text-brand-100 text-xs font-bold uppercase tracking-widest mt-1 opacity-70">
              Busque pelo nome ou código do produto
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
          >
            <i className="ph ph-x text-xl"></i>
          </button>
        </div>
        
        <div className="p-6 shrink-0 border-b border-slate-100 bg-slate-50">
          <div className="relative">
            <i className="ph ph-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-2xl font-bold"></i>
            <input 
              type="text" 
              autoFocus
              placeholder="Digite o nome do produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 pl-14 pr-6 outline-none focus:border-brand-500 font-bold text-slate-700 shadow-sm transition-all text-lg"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 bg-slate-50">
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest">
              Nenhum produto encontrado.
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {filteredProducts.map(p => (
                <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-brand-300 transition-all flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-brand-500 shrink-0">
                    <i className="ph ph-package text-2xl"></i>
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="font-black text-slate-800 text-sm uppercase truncate">{p.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><i className="ph ph-barcode"></i> {p.barcode}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                      <span className="text-emerald-500 font-black">{Number(p.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => onSelectProduct(p.barcode)}
                    className="px-6 py-4 bg-slate-100 text-slate-600 font-black hover:bg-brand-500 hover:text-white rounded-xl transition-colors shrink-0 uppercase text-xs tracking-wider"
                  >
                    Adicionar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductSearchModal;