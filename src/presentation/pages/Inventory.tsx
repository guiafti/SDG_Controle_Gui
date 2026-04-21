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
    reader.onload = (event: any) => {
      setFormImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleArchive = async () => {
    if (!editingProduct) return;
    const action = showArchived ? 'Restaurar' : 'Arquivar';
    const confirmMsg = showArchived ? 'Deseja restaurar este produto?' : 'Deseja arquivar este produto?';

    toast((t) => (
      <div className="flex flex-col gap-4 p-2 text-center">
        <h3 className="font-black text-slate-800 text-lg uppercase">{action} Produto?</h3>
        <p className="text-sm text-slate-500 font-medium">{confirmMsg}</p>
        <div className="flex gap-3 mt-2">
          <button 
            onClick={() => toast.dismiss(t.id)}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const result = await window.api.archiveProduct({ 
                  id: editingProduct.id, 
                  archived: !showArchived 
                });
                if (result.success) {
                  toast.success(showArchived ? 'Produto restaurado!' : 'Produto arquivado!');
                  setIsModalOpen(false);
                  fetchData();
                }
              } catch (e) {
                toast.error('Erro ao processar arquivamento.');
              }
            }}
            className={`flex-1 py-3 text-white rounded-xl font-bold transition-colors ${showArchived ? 'bg-blue-500 hover:bg-blue-600' : 'bg-orange-500 hover:bg-orange-600'}`}
          >
            {action}
          </button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center', style: { padding: '20px', borderRadius: '24px' } });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formName || !formBarcode || !formPrice) {
      toast.error('POR FAVOR, PREENCHA TODOS OS CAMPOS!');
      return;
    }

    const loadingId = toast.loading('Salvando produto...');

    try {
      let finalImageName = editingProduct?.image || null;

      if (!formImage) {
        finalImageName = null;
      } else if (formImage.startsWith('data:image')) {
        const uploadResult = await window.api.uploadProductImage({
          barcode: formBarcode,
          base64Data: formImage
        });
        if (uploadResult.success) {
          finalImageName = uploadResult.fileName;
        }
      }

      const productData = {
        id: editingProduct?.id || null,
        name: formName,
        barcode: formBarcode,
        price: formPrice,
        image: finalImageName
      };

      const result = await window.api.saveManualProduct(productData);
      
      if (result.success) {
        // Se for admin, atualizar as quantidades de estoque também
        if (role === 'admin' && editingProduct?.id) {
          for (const s of stores) {
            await window.api.updateInventoryQuantity({ 
              productId: editingProduct.id, 
              storeId: s.id, 
              quantity: Number(formStocks[s.id] || 0),
              minStock: Number(formMinStocks[s.id] ?? 2),
              saleToleranceDays: Number(formSaleTolerances[s.id] ?? 30)
            });
          }
        }

        toast.success('PRODUTO SALVO COM SUCESSO!', { id: loadingId });
        setIsModalOpen(false);
        fetchData();
      } else {
        toast.error(`ERRO NO BANCO: ${result.error || 'Falha desconhecida'}`, { id: loadingId });
      }
    } catch (error) {
      console.error('Erro de comunicação:', error);
      toast.error('ERRO CRÍTICO: Falha na comunicação com o Processo Principal.', { id: loadingId });
    }
  };

  const handleImportXML = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event: any) => {
        const xmlData = event.target.result;
        
        toast((t) => (
          <div className="flex flex-col gap-4 p-2 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl mx-auto">
              <i className="ph ph-storefront text-2xl font-bold"></i>
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg uppercase leading-tight">Destino da Carga</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Selecione a loja para entrada</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {stores.map(s => (
                <button 
                  key={s.id}
                  onClick={async () => {
                    toast.dismiss(t.id);
                    const loadingId = toast.loading('Processando Protocolo Guardião...');
                    try {
                      const result = await window.api.importXmlProducts(xmlData, String(s.id));
                      toast.success(
                        <div className="flex flex-col">
                          <span className="font-black">IMPORTAÇÃO CONCLUÍDA!</span>
                          <span className="text-[10px] uppercase opacity-80">Novos: {result.newProducts} | Estoque: {result.stockUpdates}</span>
                        </div>, 
                        { id: loadingId, duration: 4000 }
                      );
                      fetchData();
                    } catch (err) {
                      toast.error('ERRO NO PROCESSAMENTO DO XML', { id: loadingId });
                    }
                  }}
                  className="py-3 bg-slate-50 text-slate-600 rounded-xl font-black hover:bg-brand-600 hover:text-white transition-all text-[10px] uppercase border border-slate-100"
                >
                  {s.name}
                </button>
              ))}
            </div>
            <button 
              onClick={() => toast.dismiss(t.id)}
              className="mt-2 text-[9px] font-black text-slate-400 hover:text-red-500 uppercase transition-colors"
            >
              Cancelar Operação
            </button>
          </div>
        ), { duration: Infinity, position: 'top-center', style: { padding: '24px', borderRadius: '32px', minWidth: '320px', border: '1px solid #e2e8f0' } });
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleDownloadTemplate = async () => {
    try {
      const template = await window.api.downloadProtocolTemplate();
      const blob = new Blob([template], { type: 'text/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'modelo_protocolo_guardiao.xml';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Modelo baixado com sucesso!');
    } catch (err) {
      toast.error('ERRO AO GERAR MODELO');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full font-sans overflow-x-hidden">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">
            {showArchived ? 'Produtos Arquivados' : 'Estoque Multiloja'}
          </h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Painel de Controle de Inventário</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowArchived(!showArchived)}
            className={`px-6 py-5 rounded-[20px] font-black flex items-center gap-3 transition-all ${showArchived ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            <i className={`ph ${showArchived ? 'ph-archive-box' : 'ph-archive'} text-2xl`}></i>
            {showArchived ? 'VER ATIVOS' : 'ARQUIVADOS'}
          </button>
          
          {!showArchived && role === 'admin' && (
            <>
              <button 
                onClick={handleDownloadTemplate}
                className="bg-slate-200 text-slate-600 px-6 py-5 rounded-[20px] font-black flex items-center gap-3 hover:bg-slate-300 transition-all"
              >
                <i className="ph ph-download-simple text-2xl"></i>
                MODELO XML
              </button>
              <button 
                onClick={handleImportXML}
                className="bg-blue-600 text-white px-6 py-5 rounded-[20px] font-black flex items-center gap-3 hover:bg-blue-700 shadow-2xl shadow-blue-500/40 transition-all"
              >
                <i className="ph ph-file-arrow-up text-2xl"></i>
                IMPORTAR XML
              </button>
              <button 
                onClick={() => openModal()}
                className="bg-brand-600 text-white px-8 py-5 rounded-[20px] font-black flex items-center gap-3 hover:bg-brand-700 shadow-2xl shadow-brand-500/40 active:scale-95 transition-all"
              >
                <i className="ph ph-plus-circle text-2xl"></i>
                NOVO ACESSÓRIO
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mb-6 relative">
        <i className="ph ph-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-2xl font-bold"></i>
        <input 
          type="text" 
          placeholder="Pesquisar produto por nome ou código de barras..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-14 pr-6 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 font-bold text-slate-700 shadow-sm transition-all"
        />
      </div>

      <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <div className="w-10 mr-4"></div>
          <div className="flex-1">Produto e Código</div>
          <div className="w-32">Valor Base</div>
          <div className="w-60 text-center">Estoques Lojas</div>
          <div className="w-8"></div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest">
            {searchTerm ? 'Nenhum produto encontrado para esta pesquisa.' : 'Nenhum produto cadastrado no catálogo.'}
          </div>
        ) : (
            <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
            {filteredProducts.map(p => (
              <div key={p.id} className="flex items-center px-4 py-3 hover:bg-slate-50/80 transition-colors group">
                
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors shrink-0 mr-4 overflow-hidden border border-slate-200">
                  {p.image ? (
                    <img 
                      src={p.image.startsWith('http') ? p.image : `local-img://${p.image}`} 
                      className="w-full h-full object-cover" 
                      alt={p.name} 
                    />
                  ) : (
                    <i className="ph ph-package text-xl"></i>
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="font-bold text-slate-800 text-sm truncate">{p.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold">
                      <i className="ph ph-barcode"></i> {p.barcode}
                    </span>
                  </div>
                </div>

                <div className="w-32 shrink-0">
                  <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                    {Number(p.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                <div className="w-60 flex items-center justify-center gap-2 shrink-0 overflow-x-auto no-scrollbar">
                  {stores.map((s, idx) => {
                    const stock = p.stocks?.[s.id] || 0;
                    const min = p.minStocks?.[s.id] ?? 2;
                    const isLow = stock <= min;
                    return (
                      <React.Fragment key={s.id}>
                        <div className={`flex flex-col items-center p-1.5 rounded-lg transition-colors min-w-[45px] ${isLow ? 'bg-red-50 ring-1 ring-red-100' : ''}`}>
                          <span className={`text-[7px] font-black uppercase mb-0.5 truncate max-w-[40px] ${isLow ? 'text-red-400' : 'text-slate-400'}`}>{s.name}</span>
                          <div className="flex items-center gap-0.5">
                            <span className={`text-xs font-black ${isLow ? 'text-red-600' : 'text-slate-700'}`}>{stock}</span>
                            {isLow && <i className="ph ph-warning-octagon text-[10px] text-red-500 animate-pulse"></i>}
                          </div>
                        </div>
                        {idx < stores.length - 1 && <div className="w-px h-6 bg-slate-200 shrink-0"></div>}
                      </React.Fragment>
                    );
                  })}
                </div>

                <button 
                  onClick={() => openModal(p)}
                  className="w-8 h-8 ml-4 flex items-center justify-center rounded-lg text-slate-400 hover:bg-brand-500 hover:text-white transition-all shrink-0"
                  title="Editar Produto"
                >
                  <i className="ph ph-pencil-simple text-lg"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 pt-14">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-brand-600 p-6 text-white shrink-0">
              <h3 className="text-xl font-black uppercase tracking-tighter italic">
                {editingProduct ? 'Editar Informações' : 'Cadastro de Acessório'}
              </h3>
              <p className="text-brand-100 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">Preencha o protocolo de entrada</p>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              {/* ÁREA DE UPLOAD DE IMAGEM */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Foto do Produto (Clique para Alterar)</label>
                <div className="flex flex-col items-center gap-3">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-32 h-32 mx-auto rounded-2xl border-4 border-dashed border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-brand-300 hover:bg-brand-50 transition-all group relative"
                  >
                    {formImage ? (
                      <img 
                        src={formImage.startsWith('data:image') ? formImage : (formImage.startsWith('http') ? formImage : `local-img://${formImage}`)} 
                        className="w-full h-full object-cover" 
                        alt="Preview" 
                      />
                    ) : (
                      <div className="text-center">
                        <i className="ph ph-image-plus text-3xl text-slate-300 group-hover:text-brand-400 transition-colors"></i>
                        <p className="text-[9px] font-bold text-slate-400 mt-1">UPLOAD</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>
                  
                  {formImage && (
                    <button 
                      type="button"
                      onClick={() => setFormImage('')}
                      className="text-[9px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors"
                    >
                      Remover Foto
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome Comercial do Produto</label>
                <input 
                  value={formName || ''}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="EX: CAPA MAGSAFE IPHONE 15"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-brand-500 font-black text-slate-700 transition-all uppercase text-sm" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Código de Barras (EAN)</label>
                  <input 
                    value={formBarcode || ''}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="0000000000000"
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-brand-500 font-mono font-black text-base" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Preço Unitário (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={formPrice || ''}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="0,00"
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-brand-500 font-black text-brand-600 text-lg" 
                  />
                </div>
              </div>

              {role === 'admin' && editingProduct && (
                <>
                  <div className="bg-slate-50 p-5 rounded-3xl border-2 border-slate-100">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Ajuste de Estoque Físico (ADMIN)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {stores.map(s => (
                        <div key={s.id} className="text-center">
                          <span className="text-[8px] font-black text-slate-400 uppercase truncate block">{s.name}</span>
                          <input 
                            type="number" 
                            value={formStocks[s.id] || 0} 
                            onChange={e => setFormStocks({...formStocks, [s.id]: parseInt(e.target.value) || 0})} 
                            className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-center font-black text-sm" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-orange-50/50 p-5 rounded-3xl border-2 border-orange-100/50">
                    <label className="block text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3 text-center">Estoque Mínimo de Alerta (ADMIN)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {stores.map(s => (
                        <div key={s.id} className="text-center">
                          <span className="text-[8px] font-black text-orange-400 uppercase truncate block">{s.name}</span>
                          <input 
                            type="number" 
                            value={formMinStocks[s.id] ?? 2} 
                            onChange={e => setFormMinStocks({...formMinStocks, [s.id]: parseInt(e.target.value) || 0})} 
                            className="w-full mt-1 p-2 bg-white border border-orange-200 rounded-lg text-center font-black text-sm text-orange-600 outline-none focus:border-orange-500" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-brand-50/50 p-5 rounded-3xl border-2 border-brand-100/50">
                    <label className="block text-[10px] font-black text-brand-400 uppercase tracking-widest mb-3 text-center">Tolerância de Venda - Dias (ADMIN)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {stores.map(s => (
                        <div key={s.id} className="text-center">
                          <span className="text-[8px] font-black text-brand-400 uppercase truncate block">{s.name}</span>
                          <input 
                            type="number" 
                            value={formSaleTolerances[s.id] ?? 30} 
                            onChange={e => setFormSaleTolerances({...formSaleTolerances, [s.id]: parseInt(e.target.value) || 0})} 
                            className="w-full mt-1 p-2 bg-white border border-brand-200 rounded-lg text-center font-black text-sm text-brand-600 outline-none focus:border-brand-500" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4 shrink-0">
                {role === 'admin' && editingProduct && (
                  <button 
                    type="button" 
                    onClick={handleArchive}
                    className={`flex-1 py-4 rounded-xl font-black uppercase text-[10px] transition-all ${showArchived ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}
                  >
                    {showArchived ? 'Restaurar' : 'Arquivar'}
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 py-4 font-black text-slate-300 hover:text-slate-500 transition-colors uppercase text-[10px]"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] py-4 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 shadow-xl shadow-emerald-500/30 transition-all active:scale-95"
                >
                  {editingProduct ? 'ATUALIZAR' : 'GRAVAR PRODUTO'}
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