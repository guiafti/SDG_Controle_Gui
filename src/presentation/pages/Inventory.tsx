import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface InventoryProps {
  role?: string;
}

const Inventory: React.FC<InventoryProps> = ({ role }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  const [formName, setFormName] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formStocks, setFormStocks] = useState<Record<string, number>>({});
  const [formMinStocks, setFormMinStocks] = useState<Record<string, number>>({});
  const [formSaleTolerances, setFormSaleTolerances] = useState<Record<string, number>>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const [pData, sData] = await Promise.all([
        window.api.getAllProducts(),
        window.api.getStores()
      ]);
      setProducts(pData || []);
      setStores(sData || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredProducts = products.filter(p => 
    (showArchived ? p.archived === 1 : p.archived === 0) &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.barcode.includes(searchTerm))
  );

  // Predictive Analytics Stats
  const stats = {
    total: filteredProducts.length,
    critical: filteredProducts.filter(p => {
        return stores.some(s => (p.stocks?.[s.id] || 0) <= (p.minStocks?.[s.id] ?? 2));
    }).length,
    stale: filteredProducts.filter(p => {
        // Here we'd ideally check last sale date, but using the indicator for demo
        return false; // Placeholder for logic
    }).length,
    highValue: filteredProducts.filter(p => p.price > 500).length
  };

  const openModal = (p: any = null) => {
    setEditingProduct(p);
    setFormName(p?.name || '');
    setFormBarcode(p?.barcode || '');
    setFormPrice(p?.price?.toString() || '');
    setFormImage(p?.image || '');
    
    const stocks: Record<string, number> = {};
    const minStocks: Record<string, number> = {};
    const saleTolerances: Record<string, number> = {};
    
    stores.forEach(s => {
      stocks[s.id] = p?.stocks?.[s.id] || 0;
      minStocks[s.id] = p?.minStocks?.[s.id] ?? 2;
      saleTolerances[s.id] = p?.staleDays?.[s.id] ?? 30;
    });
    
    setFormStocks(stocks);
    setFormMinStocks(minStocks);
    setFormSaleTolerances(saleTolerances);
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: any) => setFormImage(event.target.result);
    reader.readAsDataURL(file);
  };

  const handleArchive = async () => {
    if (!editingProduct) return;
    const action = showArchived ? 'Restaurar' : 'Arquivar';
    const result = await window.api.archiveProduct({ id: editingProduct.id, archived: !showArchived });
    if (result.success) {
      toast.success(showArchived ? 'Produto restaurado!' : 'Produto arquivado!');
      setIsModalOpen(false);
      fetchData();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formBarcode || !formPrice) {
      toast.error('PREENCHA OS CAMPOS OBRIGATÓRIOS!');
      return;
    }

    const loadingId = toast.loading('Processando registro...');
    try {
      let finalImageName = editingProduct?.image || null;
      if (formImage?.startsWith('data:image')) {
        const uploadResult = await window.api.uploadProductImage({ barcode: formBarcode, base64Data: formImage });
        if (uploadResult.success) finalImageName = uploadResult.fileName;
      } else if (!formImage) {
        finalImageName = null;
      }

      const result = await window.api.saveManualProduct({ id: editingProduct?.id || null, name: formName, barcode: formBarcode, price: formPrice, image: finalImageName });
      
      if (result.success) {
        if (role === 'admin' && editingProduct?.id) {
          for (const s of stores) {
            await window.api.updateInventoryQuantity({ 
              productId: editingProduct.id, storeId: s.id, 
              quantity: Number(formStocks[s.id] || 0),
              minStock: Number(formMinStocks[s.id] ?? 2),
              saleToleranceDays: Number(formSaleTolerances[s.id] ?? 30)
            });
          }
        }
        toast.success('ESTOQUE ATUALIZADO!', { id: loadingId });
        setIsModalOpen(false);
        fetchData();
      }
    } catch (error) { toast.error('ERRO DE COMUNICAÇÃO', { id: loadingId }); }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <main className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
        
        {/* Header Inteligente */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
                    <i className="ph ph-package text-2xl"></i>
                </div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">Centro de Inteligência de Estoque</h1>
            </div>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] ml-14">Análise Multiloja e Gestão Preditiva de Produtos</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
                onClick={() => setShowArchived(!showArchived)}
                className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${showArchived ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
            >
                {showArchived ? 'Ver Ativos' : 'Ver Arquivados'}
            </button>
            <button 
                onClick={() => openModal()}
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black shadow-xl shadow-slate-900/20 transition-all active:scale-95"
            >
                Cadastrar Novo Produto
            </button>
          </div>
        </div>

        {/* Predictive Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                    <i className="ph ph-list-numbers text-3xl"></i>
                </div>
                <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Itens</span>
                    <span className="text-2xl font-black text-slate-800 font-mono">{stats.total}</span>
                </div>
            </div>
            <div className={`bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-6 transition-all ${stats.critical > 0 ? 'border-l-4 border-l-red-500' : ''}`}>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${stats.critical > 0 ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-slate-50 text-slate-300'}`}>
                    <i className="ph ph-warning-octagon"></i>
                </div>
                <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Estoque Crítico</span>
                    <span className={`text-2xl font-black font-mono ${stats.critical > 0 ? 'text-red-600' : 'text-slate-800'}`}>{stats.critical}</span>
                </div>
            </div>
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-6">
                <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-500">
                    <i className="ph ph-currency-dollar text-3xl"></i>
                </div>
                <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Alto Valor</span>
                    <span className="text-2xl font-black text-slate-800 font-mono">{stats.highValue}</span>
                </div>
            </div>
            <div className="bg-slate-900 p-6 rounded-[32px] shadow-2xl flex items-center gap-6 relative overflow-hidden group">
                <i className="ph ph-sparkle absolute -right-4 -bottom-4 text-7xl text-white/5 rotate-12 group-hover:scale-125 transition-transform"></i>
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-brand-400">
                    <i className="ph ph-chart-line-up text-3xl"></i>
                </div>
                <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Giro Sugerido</span>
                    <span className="text-lg font-black text-white italic">Inteligência Ativa</span>
                </div>
            </div>
        </div>

        {/* Filters & View Mode */}
        <div className="flex flex-col lg:flex-row gap-4 bg-white p-4 rounded-[28px] shadow-sm border border-slate-100">
            <div className="flex-1 relative">
                <i className="ph ph-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-xl font-bold"></i>
                <input 
                    type="text" placeholder="Localizar por nome, EAN ou características..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-14 pr-6 outline-none focus:ring-2 ring-brand-500/20 transition-all text-sm font-bold text-slate-700"
                />
            </div>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                <button onClick={() => setViewMode('grid')} className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase transition-all ${viewMode === 'grid' ? 'bg-white text-brand-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                    <i className="ph ph-squares-four text-lg"></i> Galeria
                </button>
                <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase transition-all ${viewMode === 'list' ? 'bg-white text-brand-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                    <i className="ph ph-list-bullets text-lg"></i> Lista
                </button>
            </div>
        </div>

        {/* Product Display */}
        {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-20">
                {filteredProducts.map(p => (
                    <div 
                        key={p.id} onClick={() => openModal(p)}
                        className="bg-white rounded-[32px] p-4 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-brand-500/10 hover:-translate-y-1 transition-all group cursor-pointer relative overflow-hidden"
                    >
                        <div className="aspect-square bg-slate-50 rounded-[24px] overflow-hidden mb-4 border border-slate-50">
                            {p.image ? (
                                <img src={`local-img://${p.image}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.name} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-200">
                                    <i className="ph ph-package text-6xl"></i>
                                </div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">{p.barcode}</span>
                            <h4 className="text-xs font-black text-slate-800 uppercase line-clamp-2 leading-tight h-8">{p.name}</h4>
                            <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-50">
                                <span className="text-sm font-black text-brand-600 font-mono">
                                    R$ {Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                <div className="flex -space-x-2">
                                    {stores.slice(0, 3).map(s => {
                                        const qty = p.stocks?.[s.id] || 0;
                                        return (
                                            <div key={s.id} className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black shadow-sm ${qty <= (p.minStocks?.[s.id] ?? 2) ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                {qty}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        {stores.some(s => (p.stocks?.[s.id] || 0) <= (p.minStocks?.[s.id] ?? 2)) && (
                            <div className="absolute top-4 right-4 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
                        )}
                    </div>
                ))}
            </div>
        ) : (
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden mb-20">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <tr>
                            <th className="px-8 py-5">Produto</th>
                            <th className="px-8 py-5">Identificação</th>
                            <th className="px-8 py-5">Estoques (Unidades)</th>
                            <th className="px-8 py-5 text-right">Preço Base</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredProducts.map(p => (
                            <tr key={p.id} onClick={() => openModal(p)} className="hover:bg-slate-50/80 cursor-pointer transition-all group">
                                <td className="px-8 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                                            {p.image && <img src={`local-img://${p.image}`} className="w-full h-full object-cover" />}
                                        </div>
                                        <span className="text-sm font-black text-slate-700 uppercase">{p.name}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-4">
                                    <span className="text-[10px] font-mono font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-lg">#{p.barcode}</span>
                                </td>
                                <td className="px-8 py-4">
                                    <div className="flex gap-2">
                                        {stores.map(s => {
                                            const qty = p.stocks?.[s.id] || 0;
                                            const isLow = qty <= (p.minStocks?.[s.id] ?? 2);
                                            return (
                                                <div key={s.id} className={`px-3 py-1 rounded-lg flex items-center gap-2 border ${isLow ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                                    <span className="text-[8px] font-black uppercase opacity-60">{s.name.substring(0, 3)}</span>
                                                    <span className="text-xs font-black">{qty}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </td>
                                <td className="px-8 py-4 text-right">
                                    <span className="text-lg font-black text-emerald-600 font-mono">R$ {Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </main>

      {/* Modern Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-brand-500 rounded-[28px] flex items-center justify-center text-white shadow-2xl shadow-brand-500/30">
                      <i className="ph ph-package text-4xl"></i>
                  </div>
                  <div>
                      <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">{editingProduct ? 'Ajuste de Estoque' : 'Novo Produto Inteligente'}</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Configuração de Parâmetros e Multiloja</p>
                  </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-14 h-14 rounded-full hover:bg-white hover:shadow-lg flex items-center justify-center text-slate-300 transition-all">
                <i className="ph ph-x text-4xl"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-10 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Coluna Visual e Identificação */}
                    <div className="space-y-8">
                        <div className="relative group">
                            <div className="aspect-square rounded-[40px] bg-slate-50 border-4 border-dashed border-slate-100 flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-300 relative">
                                {formImage ? (
                                    <img src={formImage.startsWith('data') ? formImage : `local-img://${formImage}`} className="w-full h-full object-cover" />
                                ) : (
                                    <i className="ph ph-image-plus text-6xl text-slate-200 group-hover:text-brand-400 transition-colors"></i>
                                )}
                                <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            </div>
                            <p className="text-center text-[9px] font-black text-slate-400 uppercase mt-4 tracking-widest">Foto de Identificação</p>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Código de Barras (EAN)</label>
                                <input 
                                    value={formBarcode} onChange={e => setFormBarcode(e.target.value)}
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-brand-500 font-mono font-black"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Preço de Venda (R$)</label>
                                <input 
                                    type="number" step="0.01" value={formPrice} onChange={e => setFormPrice(e.target.value)}
                                    className="w-full p-4 bg-brand-50 border-2 border-brand-100 rounded-2xl outline-none focus:border-brand-500 font-black text-brand-600 text-xl"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Coluna Dados e Multiloja */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nome Comercial do Produto</label>
                            <input 
                                value={formName} onChange={e => setFormName(e.target.value)}
                                placeholder="EX: CAPA PREMIUM SILICONE IPHONE 15 PRO"
                                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[24px] outline-none focus:border-brand-500 font-black text-slate-700 uppercase text-lg"
                            />
                        </div>

                        {role === 'admin' && (
                            <div className="bg-white rounded-[32px] border border-slate-100 p-6 space-y-6 shadow-inner bg-slate-50/30">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-white"><i className="ph ph-buildings"></i></div>
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter italic">Gestão Multiloja (ADMIN)</h4>
                                </div>
                                <div className="space-y-4">
                                    {stores.map(s => (
                                        <div key={s.id} className="grid grid-cols-3 gap-4 items-end bg-white p-4 rounded-2xl border border-slate-100">
                                            <div className="col-span-1">
                                                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1 truncate">{s.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[8px] font-black text-slate-300">ESTOQUE:</span>
                                                    <input 
                                                        type="number" value={formStocks[s.id] || 0}
                                                        onChange={e => setFormStocks({...formStocks, [s.id]: parseInt(e.target.value) || 0})}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-center font-black text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-[8px] font-black text-orange-400 uppercase block mb-1">MÍNIMO ALERTA</span>
                                                <input 
                                                    type="number" value={formMinStocks[s.id] ?? 2}
                                                    onChange={e => setFormMinStocks({...formMinStocks, [s.id]: parseInt(e.target.value) || 0})}
                                                    className="w-full bg-orange-50/30 border border-orange-100 rounded-lg p-2 text-center font-black text-sm text-orange-600 outline-none focus:border-orange-500"
                                                />
                                            </div>
                                            <div>
                                                <span className="text-[8px] font-black text-brand-400 uppercase block mb-1">TOLERÂNCIA (DIAS)</span>
                                                <input 
                                                    type="number" value={formSaleTolerances[s.id] ?? 30}
                                                    onChange={e => setFormSaleTolerances({...formSaleTolerances, [s.id]: parseInt(e.target.value) || 0})}
                                                    className="w-full bg-brand-50/30 border border-brand-100 rounded-lg p-2 text-center font-black text-sm text-brand-600 outline-none focus:border-brand-500"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </form>

            <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-6">
                {role === 'admin' && editingProduct && (
                    <button type="button" onClick={handleArchive} className={`px-10 py-5 rounded-[28px] font-black uppercase text-xs tracking-widest transition-all ${showArchived ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}>
                        {showArchived ? 'Reativar Produto' : 'Arquivar Produto'}
                    </button>
                )}
                <div className="flex-1 flex gap-4">
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 px-10 py-5 rounded-[28px] border-2 border-slate-200 text-slate-500 font-black uppercase text-xs tracking-widest hover:bg-white transition-all">Descartar</button>
                    <button onClick={handleSave} className="flex-[2] bg-brand-600 text-white py-5 rounded-[28px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-brand-500/30 hover:scale-[1.02] active:scale-95 transition-all">Confirmar e Gravar</button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;