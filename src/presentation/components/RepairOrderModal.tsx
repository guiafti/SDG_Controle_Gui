import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface RepairOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CHECKLIST_OPTIONS = [
  'Carregador',
  'Cabo USB',
  'Capa de Proteção',
  'Cartão SIM',
  'Cartão de Memória',
  'Caixa Original',
  'Nota Fiscal'
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa', color: 'bg-slate-100 text-slate-600' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-600' },
  { value: 'high', label: 'Alta', color: 'bg-orange-100 text-orange-600' },
  { value: 'urgent', label: 'Urgente', color: 'bg-red-100 text-red-600' }
];

const RepairOrderModal: React.FC<RepairOrderModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [issue, setIssue] = useState('');
  const [technicalNotes, setTechnicalNotes] = useState('');
  const [priority, setPriority] = useState('normal');
  const [price, setPrice] = useState('');
  const [destStoreId, setDestStoreId] = useState('');
  const [returnStoreId, setReturnStoreId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [checklist, setChecklist] = useState<string[]>([]);

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
    setSerialNumber('');
    setIssue('');
    setTechnicalNotes('');
    setPriority('normal');
    setPrice('');
    setPhoto(null);
    setDeliveryDate('');
    setChecklist([]);
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

  const toggleChecklist = (item: string) => {
    setChecklist(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
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
        serial_number: serialNumber,
        issue_description: issue,
        technical_notes: technicalNotes,
        checklist: checklist.join(', '),
        priority,
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <i className="ph ph-wrench text-2xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Nova Ordem de Manutenção</h2>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Controle de Assistência</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
            <i className="ph ph-x text-2xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna 1: Cliente e Dispositivo */}
            <div className="lg:col-span-2 space-y-6">
              <section className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-4 bg-brand-500 rounded-full"></div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Informações do Cliente</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">Nome Completo *</label>
                    <input 
                      type="text" required value={customerName} onChange={e => setCustomerName(e.target.value)}
                      placeholder="Nome do Cliente"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 transition-all font-semibold text-sm text-slate-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">Telefone / WhatsApp</label>
                    <input 
                      type="text" value={customerPhone} 
                      onChange={e => setCustomerPhone(maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 transition-all font-semibold text-sm text-slate-700"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-4 bg-brand-500 rounded-full"></div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Equipamento</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">Marca *</label>
                    <input 
                      type="text" required value={brand} onChange={e => setBrand(e.target.value)}
                      placeholder="Ex: Samsung"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 transition-all font-semibold text-sm text-slate-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">Modelo *</label>
                    <input 
                      type="text" required value={model} onChange={e => setModel(e.target.value)}
                      placeholder="Ex: Galaxy S23"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 transition-all font-semibold text-sm text-slate-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">Nº de Série</label>
                    <input 
                      type="text" value={serialNumber} onChange={e => setSerialNumber(e.target.value)}
                      placeholder="Opcional"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 transition-all font-semibold text-sm text-slate-700"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">Defeito Relatado</label>
                    <textarea 
                      rows={2} value={issue} onChange={e => setIssue(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 transition-all resize-none font-medium text-sm text-slate-700"
                      placeholder="Descrição do problema..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">Observações Entrada</label>
                    <textarea 
                      rows={2} value={technicalNotes} onChange={e => setTechnicalNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 transition-all resize-none font-medium text-sm text-slate-700"
                      placeholder="Estado físico, riscos..."
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-4 bg-brand-500 rounded-full"></div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Checklist</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CHECKLIST_OPTIONS.map(item => (
                    <button
                      key={item} type="button" onClick={() => toggleChecklist(item)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight border transition-all ${checklist.includes(item) ? 'bg-brand-500 border-brand-500 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Coluna 2: Status, Valores e Foto */}
            <div className="space-y-6">
              <section className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-4 bg-brand-500 rounded-full"></div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Logística</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    {PRIORITY_OPTIONS.map(opt => (
                      <button
                        key={opt.value} type="button" onClick={() => setPriority(opt.value)}
                        className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase transition-all ${priority === opt.value ? 'bg-white shadow-sm text-brand-600' : 'text-slate-400 hover:text-slate-500'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">Técnico (Loja)</label>
                    <select 
                      required value={destStoreId} onChange={e => setDestStoreId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 font-semibold text-sm text-slate-700 appearance-none"
                    >
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">Retirada (Loja)</label>
                    <select 
                      required value={returnStoreId} onChange={e => setReturnStoreId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 font-semibold text-sm text-slate-700 appearance-none"
                    >
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-4 bg-brand-500 rounded-full"></div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prazos e Valores</h3>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">Previsão Entrega</label>
                    <input 
                      type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 font-semibold text-sm text-slate-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">Orçamento (R$)</label>
                    <input 
                      type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                      className="w-full bg-brand-50 border border-brand-200 rounded-xl p-3 outline-none focus:border-brand-500 font-bold text-xl text-brand-600"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-4 bg-brand-500 rounded-full"></div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Foto</h3>
                </div>
                <div className="relative group">
                  {photo ? (
                    <div className="relative h-32 rounded-2xl overflow-hidden border border-slate-200">
                      <img src={photo} className="w-full h-full object-cover" alt="Preview" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                          type="button" onClick={() => setPhoto(null)}
                          className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                        >
                          <i className="ph ph-trash text-lg"></i>
                        </button>
                        <label className="w-8 h-8 bg-white text-slate-800 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer">
                          <i className="ph ph-camera text-lg"></i>
                          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-all">
                      <i className="ph ph-camera text-2xl text-slate-400 mb-1"></i>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Anexar Foto</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </label>
                  )}
                </div>
              </section>
            </div>
          </div>
        </form>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button 
            type="button" onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-white transition-all uppercase text-[10px] tracking-wider"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSubmit} disabled={loading}
            className="flex-[2] py-3 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 shadow-lg shadow-brand-500/20 transition-all uppercase text-[10px] tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Salvando...
              </>
            ) : (
              <>
                <i className="ph ph-check-circle text-xl"></i>
                Gerar Ordem de Serviço
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RepairOrderModal;