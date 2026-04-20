import React, { useState } from 'react';
import LoginModal from './components/LoginModal';
import MaintenanceModal from './components/MaintenanceModal';
import PDVHeader from './components/PDVHeader';
import BarcodeScanner from './components/BarcodeScanner';
import CartList from './components/CartList';
import FinancialPanel from './components/FinancialPanel';
import Sidebar from './components/Sidebar';
import AdminHeader from './components/AdminHeader';
import Dashboard from './pages/Dashboard';
import Commissions from './pages/Commissions';
import { CartItem } from '../domain/CartItem';

const App: React.FC = () => {
  const [view, setView] = useState<'pdv' | 'admin'>('admin');
  const [adminSubView, setAdminSubView] = useState('dashboard');
  const [isLoginOpen, setIsLoginOpen] = useState(true);
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [pdvConfigurado, setPdvConfigurado] = useState(false);
  const [loja, setLoja] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [carrinho, setCarrinho] = useState<CartItem[]>([]);
  const [desconto, setDesconto] = useState(0);
  const [contadorManutencao, setContadorManutencao] = useState(1);

  const handleLogin = (loja: string, vendedor: string) => {
    setLoja(loja);
    setVendedor(vendedor);
    setPdvConfigurado(true);
    setIsLoginOpen(false);
    setView('pdv');
  };

  const handleLogout = () => {
    if (confirm('Deseja realmente encerrar o turno? O caixa será fechado.')) {
      setPdvConfigurado(false);
      setCarrinho([]);
      setDesconto(0);
      setLoja('');
      setVendedor('');
      setIsLoginOpen(true);
      setView('admin');
    }
  };

  const processarCodigo = async (codigo: string) => {
    if (!codigo) return;
    try {
      const produto = await window.api.getProductByBarcode(codigo);
      if (produto) {
        setCarrinho(prev => [...prev, {
          id: produto.id,
          nome: produto.name,
          qtd: 1,
          preco: produto.price,
          imagem: produto.image
        }]);
      } else {
        alert('Produto não encontrado no banco local!');
      }
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
    }
  };

  const handleFinishSale = async (paymentMethod: string) => {
    if (carrinho.length === 0) return alert('Caixa vazio!');
    
    const subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);
    const totalFinal = Math.max(0, subtotal - desconto);

    const sale = {
      total: totalFinal,
      discount: desconto,
      payment_method: paymentMethod,
      vendedor,
      loja,
      items: carrinho
    };

    try {
      await window.api.saveSale(sale);
      alert(`VENDA CONCLUÍDA!\nTotal: ${totalFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
      setCarrinho([]);
      setDesconto(0);
    } catch (error) {
      alert('Erro ao salvar venda!');
      console.error(error);
    }
  };

  const handleMaintenanceSubmit = (aparelho: string, servico: string, valor: number) => {
    setCarrinho(prev => [...prev, {
      id: 'OS-' + contadorManutencao.toString().padStart(4, '0'),
      nome: `Serviço: ${aparelho} (${servico})`,
      qtd: 1,
      preco: valor,
      imagem: 'https://placehold.co/150x150/ffedd5/ea580c?text=Serviço'
    }]);
    setContadorManutencao(prev => prev + 1);
    setIsMaintenanceOpen(false);
  };

  const totalVenda = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);

  return (
    <div className="h-screen w-full overflow-hidden">
      <LoginModal 
        isOpen={isLoginOpen} 
        onLogin={handleLogin} 
        onGoToAdmin={() => setIsLoginOpen(false)} 
      />

      <MaintenanceModal 
        isOpen={isMaintenanceOpen} 
        onClose={() => setIsMaintenanceOpen(false)} 
        onSubmit={handleMaintenanceSubmit} 
      />

      {/* TELA PDV */}
      {view === 'pdv' && (
        <div id="tela-pdv" className="fixed inset-0 bg-slate-100 z-50 flex flex-col">
          <PDVHeader 
            loja={loja} 
            vendedor={vendedor} 
            onGoToAdmin={() => setView('admin')} 
            onLogout={handleLogout} 
          />
          <div className="flex-1 overflow-hidden flex gap-6 p-6">
            <div className="flex-1 flex flex-col gap-4">
              <BarcodeScanner 
                onScan={processarCodigo} 
                onOpenMaintenance={() => setIsMaintenanceOpen(true)} 
              />
              <CartList items={carrinho} />
            </div>
            <FinancialPanel 
              totalItems={totalVenda} 
              discount={desconto}
              onDiscountChange={setDesconto}
              onFinish={handleFinishSale} 
            />
          </div>
        </div>
      )}

      {/* TELA ADMIN */}
      {view === 'admin' && (
        <div id="app-container" className="flex h-screen w-full">
          <Sidebar 
            activeView={adminSubView} 
            onSwitchView={setAdminSubView} 
            onOpenPDV={() => {
              if (!pdvConfigurado) setIsLoginOpen(true);
              else setView('pdv');
            }} 
          />
          <main className="flex-1 overflow-y-auto bg-slate-50 flex flex-col relative">
            <AdminHeader title={adminSubView === 'dashboard' ? 'Visão Geral (Dashboard)' : 'Fechamento de Comissões'} />
            {adminSubView === 'dashboard' ? <Dashboard /> : <Commissions />}
          </main>
        </div>
      )}
    </div>
  );
};

export default App;