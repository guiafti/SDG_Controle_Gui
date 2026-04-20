import React, { useRef, useEffect } from 'react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onOpenMaintenance: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onOpenMaintenance }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onScan(inputRef.current?.value || '');
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-brand-500 flex items-center gap-4 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-brand-500"></div>
        <i className="ph ph-barcode text-5xl text-brand-500 ml-4"></i>
        <input 
          ref={inputRef}
          type="number" 
          placeholder="Passe o leitor de código de barras aqui..." 
          className="flex-1 text-3xl font-black text-slate-800 outline-none bg-transparent placeholder:text-slate-300 placeholder:font-medium"
          onKeyPress={handleKeyPress}
          autoComplete="off"
        />
        <button 
          onClick={() => {
            onScan(inputRef.current?.value || '');
            if (inputRef.current) inputRef.current.value = '';
          }}
          className="bg-slate-800 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-700 active:scale-95 transition-transform"
        >
          INSERIR
        </button>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={onOpenMaintenance}
          className="flex-1 bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 text-slate-700 hover:text-orange-600 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <i className="ph ph-wrench text-xl"></i>
          Lançar Serviço / Manutenção
        </button>
        <button 
          onClick={() => alert('Pesquisa manual em breve')}
          className="flex-1 bg-white border border-slate-200 hover:border-brand-300 hover:bg-brand-50 text-slate-700 hover:text-brand-600 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <i className="ph ph-magnifying-glass text-xl"></i>
          Pesquisar Produto Manualmente
        </button>
      </div>
    </div>
  );
};

export default BarcodeScanner;