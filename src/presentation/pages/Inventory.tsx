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
      <main className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        
        {/* Compact Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Controle de Estoque</h1>
            <p className="text-slate-500 font-medium text-xs mt-0.5">Gestão de Inventário e Análise Multiloja</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
                onClick={() => setShowArchived(!showArchived)}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${showArchived ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 shadow-sm'}`}
            >
                {showArchived ? 'Ver Ativos' : 'Ver Arquivados'}
            </button>
            <button 
                onClick={() => openModal()}
                className="bg-brand-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-brand-600 shadow-md shadow-brand-500/20 transition-all"
            >
                <i className="ph ph-plus-circle text-xl"></i> Novo Produto
            </button>
          </div>
        </div>

        {/* Compact Stats */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            <div className="flex-none bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500"><i className="ph ph-list-numbers text-lg"></i></div>
                <div>
                    <div className="text-xs font-bold text-slate-800">{stats.total}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Itens</div>
                </div>
            </div>
            <div className={`flex-none bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 transition-all ${stats.critical > 0 ? 'border-l-4 border-l-red-500' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${stats.critical > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-400'}`}>
                    <i className="ph ph-warning-octagon"></i>
                </div>
                <div>
                    <div className={`text-xs font-bold ${stats.critical > 0 ? 'text-red-600' : 'text-slate-800'}`}>{stats.critical}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Estoque Crítico</div>
                </div>
            </div>
            <div className="flex-none bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center text-brand-500"><i className="ph ph-currency-dollar text-lg"></i></div>
                <div>
                    <div className="text-xs font-bold text-slate-800">{stats.highValue}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Alto Valor</div>
                </div>
            </div>
            <div className="flex-none bg-slate-900 px-5 py-2 rounded-xl shadow-md flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-brand-400"><i className="ph ph-chart-line-up text-lg"></i></div>
                <div>
                    <div className="text-xs font-bold text-white italic">Ativa</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Inteligência</div>
                </div>
            </div>
        </div>

        {/* Filters & View Mode */}
        <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
                <i className="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
                <input 
                    type="text" placeholder="Localizar por nome, EAN ou características..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-11 pr-4 outline-none focus:ring-2 ring-brand-500/10 transition-all text-sm font-medium text-slate-700 shadow-sm"
                />
            </div>
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 shrink-0">
                <button onClick={() => setViewMode('grid')} className={`px-4 py-1.5 rounded-lg flex items-center gap-2 text-[10px] font-bold transition-all ${viewMode === 'grid' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <i className="ph ph-squares-four text-base"></i> Galeria
                </button>
                <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 rounded-lg flex items-center gap-2 text-[10px] font-bold transition-all ${viewMode === 'list' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <i className="ph ph-list-bullets text-base"></i> Lista
                </button>
            </div>
        </div>

        {/* Product Display */}
        {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-4">
                {filteredProducts.map(p => {
                    const isLow = stores.some(s => (p.stocks?.[s.id] || 0) <= (p.minStocks?.[s.id] ?? 2));
                    return (
                        <div 
                            key={p.id} onClick={() => openModal(p)}
                            className={`bg-white rounded-2xl p-3 border transition-all group cursor-pointer relative ${isLow ? 'border-red-100 hover:border-red-200 shadow-sm hover:shadow-red-500/5' : 'border-slate-100 hover:border-slate-200 shadow-sm hover:shadow-md'}`}
                        >
                            <div className="aspect-square bg-slate-50 rounded-xl overflow-hidden mb-2 border border-slate-100">
                                {p.image ? (
                                    <img src={`local-img://${p.image}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={p.name} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                                        <i className="ph ph-package text-4xl"></i>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">#{p.barcode}</span>
                                <h4 className="text-[11px] font-bold text-slate-800 uppercase line-clamp-2 leading-tight h-7">{p.name}</h4>
                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
                                    <span className="text-xs font-bold text-brand-600 font-mono">
                                        R$ {Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                    <div className="flex -space-x-1.5">
                                        {stores.slice(0, 3).map(s => {
                                            const qty = p.stocks?.[s.id] || 0;
                                            const low = qty <= (p.minStocks?.[s.id] ?? 2);
                                            return (
                                                <div key={s.id} className={`w-5 h-5 rounded-full border border-white flex items-center justify-center text-[8px] font-bold shadow-sm ${low ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                    {qty}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            {isLow && (
                                <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white shadow-sm animate-pulse"></div>
                            )}
                        </div>
                    );
                })}
            </div>
        ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Produto</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identificação</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estoques</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Preço Base</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredProducts.map(p => (
                                <tr key={p.id} onClick={() => openModal(p)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 overflow-hidden border border-slate-100 shrink-0">
                                                {p.image && <img src={`local-img://${p.image}`} className="w-full h-full object-cover" />}
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 uppercase truncate max-w-[200px]">{p.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">#{p.barcode}</span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex gap-1.5">
                                            {stores.map(s => {
                                                const qty = p.stocks?.[s.id] || 0;
                                                const isLow = qty <= (p.minStocks?.[s.id] ?? 2);
                                                return (
                                                    <div key={s.id} className={`px-2 py-0.5 rounded flex items-center gap-1.5 border ${isLow ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                                        <span className="text-[8px] font-bold uppercase opacity-60">{s.name.substring(0, 3)}</span>
                                                        <span className="text-[10px] font-bold">{qty}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <span className="text-sm font-bold text-emerald-600 font-mono">R$ {Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </main>

      {/* Product Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                      <i className="ph ph-package text-xl"></i>
                  </div>
                  <div>
                      <h2 className="text-lg font-bold text-slate-800 tracking-tight uppercase">{editingProduct ? 'Ajuste de Estoque' : 'Novo Produto'}</h2>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Gestão Multiloja e Parâmetros</p>
                  </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
                <i className="ph ph-x text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Visual and ID Column */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="relative group">
                            <div className="aspect-square rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-300 relative">
                                {formImage ? (
                                    <img src={formImage.startsWith('data') ? formImage : `local-img://${formImage}`} className="w-full h-full object-cover" />
                                ) : (
                                    <i className="ph ph-image-plus text-4xl text-slate-200"></i>
                                )}
                                <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="space-y-0.5">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">EAN / Código</label>
                                <input 
                                    value={formBarcode} onChange={e => setFormBarcode(e.target.value)}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-brand-500 font-mono font-bold text-xs"
                                />
                            </div>
                            <div className="space-y-0.5">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Preço Base (R$)</label>
                                <input 
                                    type="number" step="0.01" value={formPrice} onChange={e => setFormPrice(e.target.value)}
                                    className="w-full p-2 bg-brand-50 border border-brand-100 rounded-lg outline-none focus:border-brand-500 font-bold text-brand-600 text-base"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Data and Multi-store Column */}
                    <div className="lg:col-span-8 space-y-4">
                        <div className="space-y-0.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome do Produto</label>
                            <input 
                                value={formName} onChange={e => setFormName(e.target.value)}
                                placeholder="EX: CAPA PREMIUM SILICONE..."
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 font-bold text-slate-700 uppercase text-sm"
                            />
                        </div>

                        {role === 'admin' && (
                            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-3 space-y-3">
                                <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                    <i className="ph ph-buildings"></i> Estoques por Loja
                                </h4>
                                <div className="space-y-2">
                                    {stores.map(s => (
                                        <div key={s.id} className="grid grid-cols-3 gap-2 items-center bg-white p-2 rounded-xl border border-slate-100">
                                            <div className="text-[9px] font-bold text-slate-500 truncate">{s.name}</div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[8px] font-bold text-slate-300">QTD:</span>
                                                <input 
                                                    type="number" value={formStocks[s.id] || 0}
                                                    onChange={e => setFormStocks({...formStocks, [s.id]: parseInt(e.target.value) || 0})}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded p-1 text-center font-bold text-xs"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[8px] font-bold text-orange-300">MÍN:</span>
                                                <input 
                                                    type="number" value={formMinStocks[s.id] ?? 2}
                                                    onChange={e => setFormMinStocks({...formMinStocks, [s.id]: parseInt(e.target.value) || 0})}
                                                    className="w-full bg-orange-50/50 border border-orange-100 rounded p-1 text-center font-bold text-xs text-orange-600"
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

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                {role === 'admin' && editingProduct && (
                    <button type="button" onClick={handleArchive} className={`px-4 py-2 rounded-lg font-bold uppercase text-[9px] tracking-wider transition-all ${showArchived ? 'bg-emerald-500 text-white' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}>
                        {showArchived ? 'Reativar' : 'Arquivar'}
                    </button>
                )}
                <div className="flex-1 flex gap-2">
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider hover:bg-white transition-all">Cancelar</button>
                    <button onClick={handleSave} className="flex-[2] bg-brand-500 text-white py-2 rounded-lg font-bold uppercase text-[9px] tracking-wider shadow-md hover:bg-brand-600 transition-all">Salvar Alterações</button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;