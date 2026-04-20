import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import LoginModal from './components/LoginModal';
import MaintenanceModal from './components/MaintenanceModal';
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
import Settings from './pages/Settings';
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
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [pdvConfigurado, setPdvConfigurado] = useState(false);
  const [loja, setLoja] = useState('');
  const [lojaId, setLojaId] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [carrinho, setCarrinho] = useState<CartItem[]>([]);
  const [desconto, setDesconto] = useState(0);
  const [contadorManutencao, setContadorManutencao] = useState(1);
  const [logoApp, setLogoApp] = useState('');

  const loadSettings = async () => {
    try {
      const settings = await window.api.getSettings();
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

  const handleLogin = (lojaNome: string, vendedor: string, role: string) => {
    const storeMap: Record<string, string> = { 'Loja Centro': '1', 'Loja Avenida': '2', 'Loja Shopping': '3' };
    setLoja(lojaNome);
    setLojaId(storeMap[lojaNome] || '1');
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
        // Notificação de estoque multiloja
        toast((t) => (
          <div className="flex flex-col gap-2 p-1 min-w-[200px]">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-2 mb-1">
              <div className="w-8 h-8 rounded bg-brand-50 flex items-center justify-center shrink-0">
                <i className="ph ph-package text-brand-600"></i>
              </div>
              <span className="font-black text-slate-800 text-xs uppercase truncate">{produto.name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className={`p-2 rounded-xl ${lojaId === '1' ? 'bg-brand-600 text-white ring-4 ring-brand-500/20' : 'bg-slate-50 text-slate-400'}`}>
                <span className="text-[8px] font-black uppercase block">Loja A</span>
                <span className="text-sm font-black">{produto.stock_1}</span>
              </div>
              <div className={`p-2 rounded-xl ${lojaId === '2' ? 'bg-brand-600 text-white ring-4 ring-brand-500/20' : 'bg-slate-50 text-slate-400'}`}>
                <span className="text-[8px] font-black uppercase block">Loja B</span>
                <span className="text-sm font-black">{produto.stock_2}</span>
              </div>
              <div className={`p-2 rounded-xl ${lojaId === '3' ? 'bg-brand-600 text-white ring-4 ring-brand-500/20' : 'bg-slate-50 text-slate-400'}`}>
                <span className="text-[8px] font-black uppercase block">Loja C</span>
                <span className="text-sm font-black">{produto.stock_3}</span>
              </div>
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
    const sale = { total: totalFinal, discount: desconto, payment_method: paymentMethod, vendedor, store_id: lojaId, items: carrinho };
    try {
      await window.api.saveSale(sale);
      toast.success(`VENDA CONCLUÍDA!\nTotal: ${totalFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
      setCarrinho([]); setDesconto(0);
    } catch (error) { toast.error('Erro ao salvar venda!'); }
  };

  const handleMaintenanceSubmit = (aparelho: string, servico: string, valor: number) => {
    const id = 'OS-' + contadorManutencao.toString().padStart(4, '0');
    setCarrinho(prev => [...prev, { id, nome: `Serviço: ${aparelho} (${servico})`, qtd: 1, preco: valor, imagem: 'https://placehold.co/150x150/ffedd5/ea580c?text=Serviço' }]);
    setContadorManutencao(prev => prev + 1); 
    setIsMaintenanceOpen(false);
  };

  const totalVenda = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);

  const renderAdminView = () => {
    switch (adminSubView) {
      case 'dashboard': return <Dashboard />;
      case 'inventory': return <Inventory role={userRole} />;
      case 'comissoes': return <Commissions />;
      case 'users': return <Users />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col bg-slate-900">
      <TitleBar logo={logoApp} />
      <div className="flex-1 relative overflow-hidden bg-white">
        <LoginModal isOpen={isLoginOpen} onLogin={handleLogin} onGoToAdmin={() => setIsLoginOpen(false)} />
        <MaintenanceModal isOpen={isMaintenanceOpen} onClose={() => setIsMaintenanceOpen(false)} onSubmit={handleMaintenanceSubmit} />
        <ProductSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onSelectProduct={(code) => { processarCodigo(code); setIsSearchOpen(false); }} storeId={lojaId} />
        {view === 'pdv' && (
          <div id="tela-pdv" className="absolute inset-0 bg-slate-100 z-50 flex flex-col">
            <PDVHeader loja={loja} vendedor={vendedor} onGoToAdmin={() => setView('admin')} onLogout={handleLogout} logo={logoApp} />
            <div className="flex-1 overflow-hidden flex gap-6 p-6">
              <div className="flex-1 flex flex-col gap-4">
                <BarcodeScanner onScan={processarCodigo} onOpenMaintenance={() => setIsMaintenanceOpen(true)} onOpenSearch={() => setIsSearchOpen(true)} />
                <CartList items={carrinho} onUpdateQuantity={updateItemQuantity} logo={logoApp} />
              </div>
              <FinancialPanel totalItems={totalVenda} discount={desconto} onDiscountChange={setDesconto} onFinish={handleFinishSale} />
            </div>
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
                adminSubView === 'settings' ? 'Personalização' : 'Gestão de Equipe'
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