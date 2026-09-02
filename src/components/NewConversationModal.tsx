import React, { useState } from 'react';
import { Plus, X, MessageSquare, User, Phone, Mail, Building, DollarSign } from 'lucide-react';
import { ChannelType, DealStage, Conversation } from '../types';
import { getChannelMeta } from '../utils/channelUtils';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (newConv: Conversation) => void;
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  onCreate
}) => {
  const [channel, setChannel] = useState<ChannelType>('whatsapp');
  const [name, setName] = useState('');
  const [phoneOrHandle, setPhoneOrHandle] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [dealValue, setDealValue] = useState(1500);
  const [initialMessage, setInitialMessage] = useState('¡Hola! Me comunico para solicitar información de sus servicios.');
  const [stage, setStage] = useState<DealStage>('Prospecto');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phoneOrHandle.trim()) return;

    const convId = `conv_${Date.now()}`;
    const newConv: Conversation = {
      id: convId,
      channel,
      contactId: `cnt_${Date.now()}`,
      contactName: name.trim(),
      contactAvatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      contactHandleOrPhone: phoneOrHandle.trim(),
      contactEmail: email.trim() || undefined,
      contactCompany: company.trim() || undefined,
      lastMessage: initialMessage,
      lastMessageTime: 'Ahora',
      unreadCount: 1,
      status: 'open',
      priority: 'medium',
      assignedAgent: 'Maycol Castañeda',
      tags: ['Nuevo Lead', getChannelMeta(channel).name],
      botActive: true,
      sentiment: 'positivo',
      leadScore: 70,
      dealStage: stage,
      dealValue: Number(dealValue) || 0,
      summary: 'Nuevo contacto registrado manualmente en la plataforma.',
      notes: 'Registrado desde el botón Nuevo Chat.',
      messages: [
        {
          id: `msg_${Date.now()}`,
          conversationId: convId,
          sender: 'customer',
          text: initialMessage,
          timestamp: 'Ahora',
          status: 'delivered'
        }
      ]
    };

    onCreate(newConv);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4 animate-scaleUp">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Iniciar Nueva Conversación / Lead</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Channel selector */}
          <div>
            <label className="text-slate-300 font-bold block mb-1.5 uppercase tracking-wider">
              Canal de Origen
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['whatsapp', 'instagram', 'messenger', 'telegram'] as const).map((ch) => {
                const m = getChannelMeta(ch);
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChannel(ch)}
                    className={`p-2 rounded-xl text-center font-semibold border transition-all flex flex-col items-center gap-1 ${
                      channel === ch
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span>{m.iconEmoji}</span>
                    <span className="text-[10px] capitalize">{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Nombre Completo *</label>
              <input
                type="text"
                required
                placeholder="ej. Laura Sánchez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Teléfono o Handle *</label>
              <input
                type="text"
                required
                placeholder="+52 55 1234 5678"
                value={phoneOrHandle}
                onChange={(e) => setPhoneOrHandle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Email (Opcional)</label>
              <input
                type="email"
                placeholder="laura@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Empresa</label>
              <input
                type="text"
                placeholder="Sánchez & Co."
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Valor Estimado ($ USD)</label>
              <input
                type="number"
                value={dealValue}
                onChange={(e) => setDealValue(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Etapa Inicial</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="Prospecto">1. Prospecto</option>
                <option value="Calificado">2. Calificado</option>
                <option value="Propuesta">3. Propuesta</option>
                <option value="Negociación">4. Negociación</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Primer Mensaje Recibido</label>
            <textarea
              rows={2}
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md"
            >
              Crear Conversación & Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
