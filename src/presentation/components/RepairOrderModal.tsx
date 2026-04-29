import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface RepairOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RepairOrderModal: React.FC<RepairOrderModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [issue, setIssue] = useState('');
  const [price, setPrice] = useState('');
  const [destStoreId, setDestStoreId] = useState('');
  const [returnStoreId, setReturnStoreId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchStores();
      resetForm();
    }
  }, [isOpen]);

  const fetchStores = async () => {
    const data = await window.api.getStores(false);
    setStores(data || []);
    if (data.length > 0) {
      setDestStoreId(data[0].id);
      const current = localStorage.getItem('selectedStoreId') || data[0].id;
      setReturnStoreId(current);
    }
  };

  const maskPhone = (val: string) => {
    const cleaned = val.replace(/\D/g, '').substring(0, 11);
    if (cleaned.length <= 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setBrand('');
    setModel('');
    setIssue('');
    setPrice('');
    setPhoto(null);
    setDeliveryDate('');
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName || !brand || !model || !destStoreId || !returnStoreId) {
      toast.error('Preencha os campos obrigatórios!');
      return;
    }

    setLoading(true);
    const loadingId = toast.loading('Gerando Ordem de Serviço...');

    try {
      const id = crypto.randomUUID();
      let finalPhotoName = null;

      if (photo) {
        const uploadResult = await window.api.uploadRepairImage({ id, base64Data: photo });
        if (uploadResult.success) {
          finalPhotoName = uploadResult.fileName;
        }
      }

      const repairData = {
        id,
        customer_name: customerName,
        customer_phone: customerPhone.replace(/\D/g, ''),
        device_brand: brand,
        device_model: model,
        issue_description: issue,
        photo_url: finalPhotoName,
        price: Number(price) || 0,
        entry_store_id: localStorage.getItem('selectedStoreId') || '1',
        maintenance_store_id: destStoreId,
        return_store_id: returnStoreId,
        delivery_date: deliveryDate,
        status: 'Na Loja (Aguardando Envio)'
      };

      const result = await window.api.saveRepair(repairData);

      if (result.success) {
        toast.success('ORDEM DE SERVIÇO GERADA!', { id: loadingId });
        onSuccess();
        onClose();
      } else {
        toast.error(`ERRO: ${result.error}`, { id: loadingId });
      }
    } catch (error) {
      toast.error('ERRO CRÍTICO AO SALVAR OS', { id: loadingId });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <i className="ph ph-wrench text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Nova Ordem de Manutenção</h2>
              <p className="text-xs text-slate-500 font-medium">Cadastre o aparelho e defina o fluxo</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
            <i className="ph ph-x text-2xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Informações do Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Nome Completo *</label>
                <input 
                  type="text" required value={customerName} onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Telefone / WhatsApp</label>
                <input 
                  type="text" value={customerPhone} 
                  onChange={e => setCustomerPhone(maskPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Detalhes do Dispositivo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Marca (Ex: Samsung) *</label>
                <input 
                  type="text" required value={brand} onChange={e => setBrand(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Modelo (Ex: Galaxy S23) *</label>
                <input 
                  type="text" required value={model} onChange={e => setModel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 transition-all"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase">Descrição do Problema</label>
              <textarea 
                rows={2} value={issue} onChange={e => setIssue(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 transition-all resize-none"
                placeholder="Descreva o que o cliente relatou..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Logística Inter-lojas</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Loja da Manutenção (Técnico) *</label>
                  <select 
                    required value={destStoreId} onChange={e => setDestStoreId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 appearance-none font-bold text-slate-700"
                  >
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Loja de Retorno (Entrega Final) *</label>
                  <select 
                    required value={returnStoreId} onChange={e => setReturnStoreId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 appearance-none font-bold text-slate-700"
                  >
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Valores e Prazo</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Prazo de Entrega</label>
                  <input 
                    type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Orçamento (R$)</label>
                  <input 
                    type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 font-mono text-lg font-bold text-brand-600"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Foto do Aparelho</h3>
            <div className="relative group">
              {photo ? (
                <div className="relative h-40 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200">
                  <img src={photo} className="w-full h-full object-cover" alt="Preview" />
                  <button 
                    type="button" onClick={() => setPhoto(null)}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <i className="ph ph-trash"></i>
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-40 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-brand-300 cursor-pointer transition-all">
                  <i className="ph ph-camera text-3xl text-slate-400 mb-2"></i>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Tirar Foto de Entrada</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
              )}
            </div>
          </div>
        </form>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button 
            type="button" onClick={onClose}
            className="flex-1 py-4 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-white transition-all uppercase text-sm tracking-widest"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSubmit} disabled={loading}
            className="flex-[2] py-4 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 shadow-lg shadow-brand-500/30 transition-all uppercase text-sm tracking-widest disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Gerar Ordem de Serviço'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RepairOrderModal;