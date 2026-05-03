import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import LoginModal from './components/LoginModal';
import MaintenanceModal from './components/MaintenanceModal';
import PrintPreviewModal from './components/PrintPreviewModal';
import PDVHeader from './components/PDVHeader';
import BarcodeScanner from './components/BarcodeScanner';
import CartList from './components/CartList';
import FinancialPanel from './components/FinancialPanel';
import Sidebar from './components/Sidebar';
import AdminHeader from './components/AdminHeader';
import ProductSearchModal from './components/ProductSearchModal';
import Dashboard from './pages/Dashboard';
import Commissions from './pages/Commissions';
import Inventory from './pages/Inventory';
import Users from './pages/Users';
import Stores from './pages/Stores';
import Settings from './pages/Settings';
import Repairs from './pages/Repairs';
import FinancialControl from './pages/FinancialControl';
import CRM from './pages/CRM';
import Analytics from './pages/Analytics';
import { CartItem } from '../domain/CartItem';

import TitleBar from './components/TitleBar';

const adjustColor = (color: string, amount: number) => {
  return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
};

const App: React.FC = () => {
  const [view, setView] = useState<'pdv' | 'admin'>('admin');
  const [adminSubView, setAdminSubView] = useState('dashboard');
  const [userRole, setUserRole] = useState('');
  const [isLoginOpen, setIsLoginOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [pdvConfigurado, setPdvConfigurado] = useState(false);
  const [loja, setLoja] = useState('');
  const [lojaId, setLojaId] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [carrinho, setCarrinho] = useState<CartItem[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [desconto, setDesconto] = useState(0);
  const [logoApp, setLogoApp] = useState('');

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadSettings = async () => {
    try {
      const [settings, sData] = await Promise.all([
        window.api.getSettings(),
        window.api.getStores()
      ]);
      setStores(sData || []);
      const colorSetting = settings.find((s: any) => s.key === 'primary_color');
      const logoSetting = settings.find((s: any) => s.key === 'logo');
      
      if (colorSetting && colorSetting.value) {
        const primaryColor = colorSetting.value;
        document.documentElement.style.setProperty('--brand-100', adjustColor(primaryColor, 160));
        document.documentElement.style.setProperty('--brand-400', adjustColor(primaryColor, 40));
        document.documentElement.style.setProperty('--brand-500', primaryColor);
        document.documentElement.style.setProperty('--brand-600', adjustColor(primaryColor, -40));
        document.documentElement.style.setProperty('--brand-900', adjustColor(primaryColor, -120));
      }
      
      if (logoSetting && logoSetting.value) {
        setLogoApp(logoSetting.value);
      }
    } catch (e) {
      console.error('Erro ao carregar configuracoes globais', e);
    }
  };

  useEffect(() => {
    loadSettings();
    
    const handleSettingsUpdated = (e: any) => {
      if (e.detail && e.detail.logo !== undefined) {
        setLogoApp(e.detail.logo);
      }
    };
    
    window.addEventListener('settings-updated', handleSettingsUpdated);
    return () => window.removeEventListener('settings-updated', handleSettingsUpdated);
  }, []);

  const handleLogin = (storeId: string, storeName: string, vendedor: string, role: string) => {
    setLoja(storeName);
    setLojaId(storeId);
    setVendedor(vendedor);
    setUserRole(role);
    setPdvConfigurado(true);
    setIsLoginOpen(false);
    setView('pdv');
  };

  const handleLogout = () => {
    toast((t) => (
      <div className="flex flex-col gap-4 p-2 text-center">
        <h3 className="font-black text-slate-800 text-lg uppercase">Encerrar Turno?</h3>
        <p className="text-sm text-slate-500 font-medium">O caixa será fechado. Deseja realmente sair?</p>
        <div className="flex gap-3 mt-2">
          <button 
            onClick={() => toast.dismiss(t.id)}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => {
              toast.dismiss(t.id);
              setPdvConfigurado(false); setCarrinho([]); setDesconto(0); setLoja(''); setLojaId(''); setVendedor('');
              setIsLoginOpen(true); setView('admin');
              toast.success('Turno encerrado com sucesso!');
            }}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
          >
            Encerrar
          </button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center', style: { padding: '20px', borderRadius: '24px' } });
  };

  const processarCodigo = async (codigo: string) => {
    if (!codigo) return;
    try {
      const produto = await window.api.getProductByBarcode(codigo, lojaId);
      if (produto) {
        // Notificação de estoque multiloja dinâmica
        toast((t) => (
          <div className="flex flex-col gap-2 p-1 min-w-[200px]">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-2 mb-1">
              <div className="w-8 h-8 rounded bg-brand-50 flex items-center justify-center shrink-0">
                <i className="ph ph-package text-brand-600"></i>
              </div>
              <span className="font-black text-slate-800 text-xs uppercase truncate">{produto.name}</span>
            </div>
            <div className={`grid gap-2 text-center ${stores.length > 3 ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {stores.slice(0, 8).map(s => (
                <div key={s.id} className={`p-2 rounded-xl transition-all ${lojaId === String(s.id) ? 'bg-brand-600 text-white ring-4 ring-brand-500/20' : 'bg-slate-50 text-slate-400'}`}>
                  <span className="text-[7px] font-black uppercase block truncate">{s.name}</span>
                  <span className="text-xs font-black">{produto.stocks?.[s.id] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        ), { position: 'bottom-left', duration: 4000, style: { borderRadius: '20px', padding: '12px', border: '1px solid #e2e8f0' } });

        if (produto.stock <= 0) toast.error(`SEM ESTOQUE NA ${loja.toUpperCase()}!`, { position: 'top-center' });
        
        setCarrinho(prev => {
          const existing = prev.find(item => item.id === produto.id);
          if (existing) {
            return prev.map(item => item.id === produto.id ? { ...item, qtd: item.qtd + 1 } : item);
          } else {
            return [...prev, { id: produto.id, nome: produto.name, qtd: 1, preco: produto.price, imagem: produto.image }];
          }
        });
      } else {
        toast.error('Produto não encontrado!');
      }
    } catch (error) { 
      console.error('Erro ao buscar produto:', error); 
    }
  };

  const updateItemQuantity = (id: string, novaQtd: number) => {
    if (novaQtd < 1) {
      setCarrinho(prev => prev.filter(item => item.id !== id));
      return;
    }
    setCarrinho(prev => prev.map(item => item.id === id ? { ...item, qtd: novaQtd } : item));
  };

  const handleFinishSale = async (paymentMethod: string) => {
    if (carrinho.length === 0) {
      toast.error('Caixa vazio!');
      return;
    }
    const subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);
    const totalFinal = Math.max(0, subtotal - desconto);
    const saleData = { total: totalFinal, discount: desconto, payment_method: paymentMethod, vendedor, store_id: lojaId, items: carrinho };
    
    const loadingId = toast.loading('Finalizando venda...');
    try {
      const result = await window.api.saveSale(saleData);
      if (result.success) {
        toast.success('VENDA CONCLUÍDA!', { id: loadingId });
        
        // Dados para o preview do comprovante
        setPreviewData({
          sale: { ...saleData, id: result.saleId, created_at: new Date().toISOString() },
          storeName: loja,
          logo: logoApp
        });
        setIsPreviewOpen(true);
        
        // Limpar carrinho após abrir o preview
        setCarrinho([]);
        setDesconto(0);
      }
    } catch (error) { 
      toast.error('Erro ao salvar venda!', { id: loadingId }); 
    }
  };

  const confirmPrint = async () => {
    if (previewData) {
      await window.api.printReceipt(previewData);
    }
    setIsPreviewOpen(false);
    setPreviewData(null);
  };

  const totalVenda = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);

  const renderAdminView = () => {
    switch (adminSubView) {
      case 'dashboard': return <Dashboard />;
      case 'inventory': return <Inventory role={userRole} />;
      case 'comissoes': return <Commissions />;
      case 'users': return <Users />;
      case 'stores': return <Stores />;
      case 'settings': return <Settings />;
      case 'repairs': return <Repairs />;
      case 'financeiro': return <FinancialControl />;
      case 'crm': return <CRM />;
      case 'analytics': return <Analytics />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col bg-slate-900">
      <TitleBar logo={logoApp} />
      <div className="flex-1 relative overflow-hidden bg-white">
        <LoginModal isOpen={isLoginOpen} onLogin={handleLogin} onGoToAdmin={() => setIsLoginOpen(false)} />
        <ProductSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onSelectProduct={(code) => { processarCodigo(code); setIsSearchOpen(false); }} storeId={lojaId} />
        {view === 'pdv' && (
          <div id="tela-pdv" className="absolute inset-0 bg-slate-100 z-50 flex flex-col">
            <PDVHeader loja={loja} vendedor={vendedor} onGoToAdmin={() => setView('admin')} onLogout={handleLogout} logo={logoApp} />
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4 p-4">
              <div className="flex-1 flex flex-col gap-3 min-w-0">
                <BarcodeScanner onScan={processarCodigo} onOpenSearch={() => setIsSearchOpen(true)} />
                <CartList items={carrinho} onUpdateQuantity={updateItemQuantity} logo={logoApp} />
              </div>
              <div className="flex flex-col gap-4">
                <FinancialPanel totalItems={totalVenda} discount={desconto} onDiscountChange={setDesconto} onFinish={handleFinishSale} />
              </div>
            </div>

            {isPreviewOpen && (
              <PrintPreviewModal 
                isOpen={isPreviewOpen} 
                onClose={() => setIsPreviewOpen(false)} 
                onConfirm={confirmPrint} 
                data={previewData} 
              />
            )}
          </div>
        )}
        {view === 'admin' && (
          <div id="app-container" className="flex h-full w-full">
            <Sidebar activeView={adminSubView} onSwitchView={setAdminSubView} onOpenPDV={() => { if (!pdvConfigurado) setIsLoginOpen(true); else setView('pdv'); }} logo={logoApp} role={userRole} />
            <main className="flex-1 overflow-y-auto bg-slate-50 flex flex-col relative">
              <AdminHeader title={
                adminSubView === 'dashboard' ? 'Visão Geral (Dashboard)' : 
                adminSubView === 'inventory' ? 'Gestão de Estoque' : 
                adminSubView === 'comissoes' ? 'Comissões' : 
                adminSubView === 'settings' ? 'Personalização' : 
                adminSubView === 'stores' ? 'Gerenciamento de Lojas' : 
                adminSubView === 'repairs' ? 'Assistência Técnica' : 
                adminSubView === 'financeiro' ? 'Controle Financeiro' : 
                adminSubView === 'crm' ? 'CRM - Gestão de Clientes' : 
                adminSubView === 'analytics' ? 'Análise Preditiva' : 'Gestão de Equipe'
              } />
              {renderAdminView()}
            </main>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;