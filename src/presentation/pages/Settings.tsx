import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

const adjustColor = (color: string, amount: number) => {
  return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
};

const Settings: React.FC = () => {
  const [primaryColor, setPrimaryColor] = useState('#3b82f6'); // brand-500 default
  const [logoBase64, setLogoBase64] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await window.api.getSettings();
        const colorSetting = settings.find((s: any) => s.key === 'primary_color');
        const logoSetting = settings.find((s: any) => s.key === 'logo');
        
        if (colorSetting) setPrimaryColor(colorSetting.value);
        if (logoSetting) setLogoBase64(logoSetting.value);
      } catch (e) {
        console.error('Erro ao carregar configurações', e);
      }
    };
    fetchSettings();
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event: any) => {
      setLogoBase64(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const loadingId = toast.loading('Salvando configurações...');
    try {
      const settingsToSave = [
        { key: 'primary_color', value: primaryColor },
        { key: 'logo', value: logoBase64 }
      ];
      await window.api.saveSettings(settingsToSave);
      
      // Compute the shades
      const c100 = adjustColor(primaryColor, 160);
      const c400 = adjustColor(primaryColor, 40);
      const c600 = adjustColor(primaryColor, -40);
      const c900 = adjustColor(primaryColor, -120);

      // Apply to root immediately
      document.documentElement.style.setProperty('--brand-100', c100);
      document.documentElement.style.setProperty('--brand-400', c400);
      document.documentElement.style.setProperty('--brand-500', primaryColor);
      document.documentElement.style.setProperty('--brand-600', c600);
      document.documentElement.style.setProperty('--brand-900', c900);

      toast.success('Configurações salvas com sucesso! As alterações visuais foram aplicadas.', { id: loadingId });
      
      // Dispatch a custom event so the App knows to update the logo if it's not using location reload
      window.dispatchEvent(new CustomEvent('settings-updated', { detail: { logo: logoBase64 } }));

    } catch (e) {
      toast.error('Erro ao salvar as configurações.', { id: loadingId });
    }
  };

  return (
    <section className="p-8 max-w-4xl mx-auto w-full">
      <div className="mb-10">
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">Personalização</h2>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Identidade Visual do Sistema</p>
      </div>

      <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 p-10 space-y-10">
        
        {/* LOGO UPLOAD */}
        <div>
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Logo da Empresa</h3>
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 rounded-2xl border-4 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden relative group">
              {logoBase64 ? (
                <img src={logoBase64} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <i className="ph ph-image text-4xl text-slate-300"></i>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <i className="ph ph-upload-simple text-white text-3xl"></i>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleLogoUpload} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              />
            </div>
            <div className="flex-1">
              <p className="text-slate-500 font-medium mb-3">
                Faça o upload do logo da sua loja para substituir o ícone padrão do sistema. Recomendamos imagens com fundo transparente (PNG) quadradas ou retangulares (Ex: 500x500px).
              </p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors text-sm"
              >
                Escolher Imagem
              </button>
              {logoBase64 && (
                <button 
                  onClick={() => setLogoBase64('')}
                  className="ml-3 px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition-colors text-sm"
                >
                  Remover Logo
                </button>
              )}
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* CORES */}
        <div>
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Cor Principal do Sistema</h3>
          <div className="flex gap-8 items-center">
            <div>
              <input 
                type="color" 
                value={primaryColor} 
                onChange={(e) => setPrimaryColor(e.target.value)} 
                className="w-20 h-20 rounded-2xl cursor-pointer border-none p-0 outline-none overflow-hidden block"
                style={{ clipPath: 'circle(40%)' }}
              />
            </div>
            <div className="flex-1">
              <p className="text-slate-500 font-medium mb-3">
                Selecione a cor predominante da marca da sua empresa. O sistema calculará automaticamente as variações de tons mais claros e escuros para adaptar aos botões e painéis.
              </p>
              <div className="flex gap-2">
                <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: adjustColor(primaryColor, 160) }}></div>
                <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: adjustColor(primaryColor, 40) }}></div>
                <div className="w-10 h-10 rounded-lg border-4 border-slate-900" style={{ backgroundColor: primaryColor }}></div>
                <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: adjustColor(primaryColor, -40) }}></div>
                <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: adjustColor(primaryColor, -120) }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 text-right">
          <button 
            onClick={handleSave}
            className="px-10 py-5 bg-brand-600 text-white font-black rounded-2xl hover:bg-brand-700 shadow-xl shadow-brand-500/30 active:scale-95 transition-all text-lg"
          >
            SALVAR ALTERAÇÕES
          </button>
        </div>
      </div>
    </section>
  );
};

export default Settings;