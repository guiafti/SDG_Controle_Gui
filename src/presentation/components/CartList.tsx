import React from 'react';
import { CartItem } from '../../domain/CartItem';

interface CartListProps {
  items: CartItem[];
  onUpdateQuantity?: (id: string, qtd: number) => void;
  logo?: string;
}

const CartList: React.FC<CartListProps> = ({ items, onUpdateQuantity, logo }) => {
  return (
    <div className="bg-white flex-1 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative">
      <div className="bg-slate-100 text-slate-500 px-6 py-3 flex text-xs uppercase font-black tracking-wider border-b border-slate-200 relative z-10">
        <div className="w-16">Item</div>
        <div className="w-14"></div>
        <div className="flex-1">Descrição do Produto</div>
        <div className="w-24 text-center">Qtd</div>
        <div className="w-32 text-right">V. Unit</div>
        <div className="w-32 text-right">Subtotal</div>
      </div>
      
      <div id="cart-items" className="flex-1 overflow-y-auto p-4 space-y-2 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative">
        
        {/* Marca d'água da Logo */}
        {logo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] z-0">
            <img src={logo} alt="Watermark" className="w-2/3 max-w-md object-contain grayscale" />
          </div>
        )}

        <div className="relative z-10 h-full">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <i className="ph ph-scanner text-7xl mb-4 opacity-20"></i>
              <p className="text-xl font-medium opacity-50">Caixa Livre e Aguardando Itens</p>
              <p className="text-sm mt-2 opacity-50">Dica: Digite 123, 456 ou 789 para testar</p>
            </div>
          ) : (
            [...items].reverse().map((item, index) => {
              const subtotal = item.preco * item.qtd;
              const itemNum = (items.length - index).toString().padStart(3, '0');
              
              // Correção para exibir imagens locais ou placeholders
              let imgUrl = item.imagem || 'https://placehold.co/150x150/f1f5f9/64748b?text=OS';
              if (item.imagem && !item.imagem.startsWith('http') && !item.imagem.startsWith('data:image')) {
                imgUrl = `local-img://${item.imagem}`;
              }

              return (
                <div key={`${item.id}-${index}`} className="flex items-center px-4 py-4 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm transition-all hover:border-brand-300 hover:shadow-md gap-2 mb-2">
                  <div className="w-12 text-slate-400 font-mono font-bold text-lg">{itemNum}</div>
                  <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                    <img src={imgUrl} className="w-full h-full object-cover" alt="Foto" />
                  </div>
                  <div className="flex-1 text-slate-800 font-black text-lg pl-2">
                    {item.nome}
                    <div className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wide">Cód: {item.id}</div>
                  </div>
                  
                  {/* Controles de Quantidade */}
                  <div className="w-24 text-center flex items-center justify-center gap-2">
                    {onUpdateQuantity ? (
                      <>
                        <button 
                          onClick={() => onUpdateQuantity(item.id, item.qtd - 1)} 
                          className="w-6 h-6 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-200 active:scale-90 transition-all font-bold"
                        >
                          -
                        </button>
                        <span className="font-black text-brand-600 text-lg w-6 text-center">{item.qtd}</span>
                        <button 
                          onClick={() => onUpdateQuantity(item.id, item.qtd + 1)} 
                          className="w-6 h-6 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center hover:bg-brand-200 active:scale-90 transition-all font-bold"
                        >
                          +
                        </button>
                      </>
                    ) : (
                      <span className="font-black text-brand-600 text-lg">{item.qtd}x</span>
                    )}
                  </div>

                  <div className="w-32 text-right text-slate-500 font-medium">
                    {item.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div className="w-32 text-right font-black text-slate-800 text-xl">
                    {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default CartList;