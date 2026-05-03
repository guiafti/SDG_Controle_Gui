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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);

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

  const stats = {
    total: filteredProducts.length,
    critical: filteredProducts.filter(p => {
        return stores.some(s => (p.stocks?.[s.id] || 0) <= (p.minStocks?.[s.id] ?? 2));
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

  const [selectedStore, setSelectedStore] = useState('1');

  const handleImportClick = () => fileInputRef.current?.click();
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event: any) => {
      const xmlData = event.target.result;
      try {
        const result = await window.api.importXmlProducts(xmlData, selectedStore);
        toast.success(`SUCESSO!\nNovos: ${result.newProducts}\nEstoques: ${result.stockUpdates}`);
        fetchData();
      } catch (error) {
        toast.error('ERRO: Verifique o formato do XML.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <main className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        
        {/* Compact Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Centro de Distribuição</h1>
              <p className="text-slate-500 font-medium text-xs mt-0.5 uppercase tracking-widest">Gestão de Inventário Multiloja</p>
            </div>
            
            {/* Guardian Protocol Inline */}
            <div className="hidden lg:flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm ml-4">
              <select 
                value={selectedStore} 
                onChange={(e) => setSelectedStore(e.target.value)}
                className="bg-transparent text-[10px] font-bold outline-none px-2 uppercase"
              >
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input type="file" ref={fileInputRef} onChange={onFileChange} accept=".xml" className="hidden" />
              <button 
                onClick={handleImportClick}
                className="bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold text-[9px] hover:bg-black flex items-center gap-1.5 transition-all"
              >
                <i className="ph ph-file-arrow-up"></i>
                IMPORTAR XML
              </button>
            </div>
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
                <i className="ph ph-plus-circle text-xl"></i> Adicionar Item
            </button>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            <div className="flex-none bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500"><i className="ph ph-barcode text-lg"></i></div>
                <div>
                    <div className="text-xs font-bold text-slate-800">{stats.total}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">SKUs Únicos</div>
                </div>
            </div>
            <div className={`flex-none bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 transition-all ${stats.critical > 0 ? 'border-l-4 border-l-red-500 shadow-red-500/5' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${stats.critical > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-400'}`}>
                    <i className="ph ph-warning-octagon"></i>
                </div>
                <div>
                    <div className={`text-xs font-bold ${stats.critical > 0 ? 'text-red-600' : 'text-slate-800'}`}>{stats.critical}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Reposição Crítica</div>
                </div>
            </div>
            <div className="flex-none bg-slate-900 px-5 py-2 rounded-xl shadow-md flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-brand-400"><i className="ph ph-sparkle text-lg"></i></div>
                <div>
                    <div className="text-xs font-bold text-white italic">Inteligência</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Análise de Giro</div>
                </div>
            </div>
        </div>

        <div className="relative">
          <i className="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
          <input 
            type="text" placeholder="Localizar produto por nome, EAN ou categoria..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 outline-none focus:ring-2 ring-brand-500/10 transition-all text-sm font-medium text-slate-700 shadow-sm"
          />
        </div>

        <div className="space-y-2 pb-10">
          {filteredProducts.length === 0 ? (
            <div className="py-32 text-center bg-white rounded-2xl border border-slate-100 opacity-40">
              <i className="ph ph-package text-6xl mb-2"></i>
              <p className="text-sm font-bold uppercase">Nenhum produto localizado</p>
            </div>
          ) : (
            filteredProducts.map(p => {
              const isExpanded = expandedId === p.id;
              const isLow = stores.some(s => (p.stocks?.[s.id] || 0) <= (p.minStocks?.[s.id] ?? 2));
              
              return (
                <div 
                  key={p.id} 
                  className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'ring-2 ring-brand-500/10 border-brand-200 shadow-lg' : 'border-slate-100 hover:border-slate-200 shadow-sm'}`}
                >
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    className="p-3 cursor-pointer flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex-none flex items-center justify-center text-slate-400 overflow-hidden border border-slate-100">
                      {p.image ? (
                        <img src={`local-img://${p.image}`} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <i className="ph ph-package text-xl"></i>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">#{p.barcode}</span>
                        <h3 className="text-xs font-bold text-slate-800 truncate uppercase tracking-tight">{p.name}</h3>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1 font-bold text-emerald-600">R$ {Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className="text-slate-300">•</span>
                        <div className="flex gap-1.5">
                          {stores.slice(0, 3).map(s => {
                            const qty = p.stocks?.[s.id] || 0;
                            const low = qty <= (p.minStocks?.[s.id] ?? 2);
                            return (
                              <span key={s.id} className={`text-[8px] font-black uppercase ${low ? 'text-red-500' : 'text-slate-400'}`}>
                                {s.name.substring(0, 3)}: {qty}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {isLow && (
                      <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-500 rounded-lg border border-red-100 animate-pulse">
                        <i className="ph ph-warning-octagon text-sm"></i>
                        <span className="text-[9px] font-black uppercase">Reposição</span>
                      </div>
                    )}

                    <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <i className="ph ph-caret-down text-lg"></i>
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-slate-50 bg-slate-50/30 animate-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-8 bg-white p-3 rounded-xl border border-slate-100">
                          <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <i className="ph ph-buildings"></i> Estoque por Unidade
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {stores.map(s => {
                              const qty = p.stocks?.[s.id] || 0;
                              const min = p.minStocks?.[s.id] ?? 2;
                              const low = qty <= min;
                              return (
                                <div key={s.id} className={`p-2 rounded-lg border flex flex-col items-center justify-center ${low ? 'bg-red-50/50 border-red-100' : 'bg-slate-50/30 border-slate-100'}`}>
                                  <span className="text-[8px] font-black text-slate-400 uppercase mb-1">{s.name}</span>
                                  <div className="flex items-baseline gap-1">
                                    <span className={`text-sm font-bold ${low ? 'text-red-600' : 'text-slate-700'}`}>{qty}</span>
                                    <span className="text-[8px] text-slate-300 font-bold">/ min {min}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="md:col-span-4 flex flex-col gap-2">
                          <button 
                            onClick={() => openModal(p)}
                            className="flex-1 bg-brand-500 text-white p-3 rounded-xl shadow-md hover:bg-brand-600 flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-all"
                          >
                            <i className="ph ph-pencil-simple-line text-lg"></i> Ajustar Produto
                          </button>
                          <div className="flex gap-2">
                            <button 
                              className="flex-1 bg-white border border-slate-200 text-slate-600 p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase transition-all"
                            >
                              <i className="ph ph-barcode text-base"></i> Etiqueta
                            </button>
                            <button 
                              onClick={() => { setEditingProduct(p); handleArchive(); }}
                              className="flex-1 bg-orange-50 text-orange-600 border border-orange-100 p-2.5 rounded-xl hover:bg-orange-100 flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase transition-all"
                            >
                              <i className="ph ph-archive text-base"></i> {showArchived ? 'Ativar' : 'Arquivar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
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