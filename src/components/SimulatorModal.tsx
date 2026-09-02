import React, { useState } from 'react';
import { 
  Smartphone, 
  X, 
  Send, 
  Bot, 
  Sparkles, 
  CheckCheck, 
  Flame, 
  Check, 
  RefreshCw,
  Zap,
  ArrowRight
} from 'lucide-react';
import { ChannelType, QuickLeadScenario } from '../types';
import { leadScenarios } from '../data/initialData';
import { getChannelMeta } from '../utils/channelUtils';

interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendSimulatedMessage: (
    channel: ChannelType,
    senderName: string,
    senderPhone: string,
    avatar: string,
    messageText: string
  ) => Promise<string | void>;
}

export const SimulatorModal: React.FC<SimulatorModalProps> = ({
  isOpen,
  onClose,
  onSendSimulatedMessage
}) => {
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>('whatsapp');
  const [senderName, setSenderName] = useState('Mariana Gómez');
  const [senderPhone, setSenderPhone] = useState('+52 55 3390 1284');
  const [messageText, setMessageText] = useState('Hola! Quiero cotizar la automatización para mi empresa de 8 asesores.');
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastBotReply, setLastBotReply] = useState<string | null>(null);

  if (!isOpen) return null;

  const channelMeta = getChannelMeta(selectedChannel);

  const handleApplyScenario = (scenario: QuickLeadScenario) => {
    setSelectedChannel(scenario.channel);
    setSenderName(scenario.senderName);
    setSenderPhone(scenario.senderPhone);
    setMessageText(scenario.message);
    setLastBotReply(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    try {
      setIsSimulating(true);
      setLastBotReply(null);

      const avatar = `https://images.unsplash.com/photo-${
        selectedChannel === 'whatsapp' ? '1534528741775-53994a69daeb' : '1507003211169-0a1dd7228f2d'
      }?w=150&auto=format&fit=crop&q=80`;

      const botReply = await onSendSimulatedMessage(
        selectedChannel,
        senderName,
        senderPhone,
        avatar,
        messageText
      );

      if (botReply) {
        setLastBotReply(botReply);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] animate-scaleUp">
        {/* Left: Configuration & Scenario Presets */}
        <div className="w-full md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between overflow-y-auto space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-white text-base font-['Outfit']">
                  Probador Omnicanal en Vivo
                </h3>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Simulador 24/7
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Envía un mensaje como si fueras un cliente real desde cualquier red social y mira cómo OmniBot IA y el CRM reaccionan en tiempo real.
            </p>

            {/* Connected Number Badge */}
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300 font-medium">Línea Oficial WhatsApp Conectada:</span>
              </div>
              <span className="font-mono font-bold text-emerald-400">+51 986 150 562</span>
            </div>

            {/* Scenarios 1-Click buttons */}
            <div className="mt-4 space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Escenarios Rápidos de Prueba (1 Clic):
              </label>
              <div className="grid grid-cols-1 gap-2">
                {leadScenarios.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => handleApplyScenario(sc)}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/40 text-left transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm">{getChannelMeta(sc.channel).iconEmoji}</span>
                      <div>
                        <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-300">
                          {sc.title}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[220px]">
                          {sc.senderName}: "{sc.message}"
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input Form */}
            <form onSubmit={handleSend} className="mt-4 space-y-3 text-xs">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Personalizar Mensaje de Prueba:
              </label>

              {/* Channel Selector */}
              <div className="grid grid-cols-4 gap-1.5">
                {(['whatsapp', 'instagram', 'messenger', 'telegram'] as const).map((ch) => {
                  const m = getChannelMeta(ch);
                  return (
                    <button
                      type="button"
                      key={ch}
                      onClick={() => setSelectedChannel(ch)}
                      className={`p-2 rounded-xl text-center font-bold border transition-all text-xs flex flex-col items-center gap-1 ${
                        selectedChannel === ch
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-base">{m.iconEmoji}</span>
                      <span className="text-[10px] capitalize">{m.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Nombre del Cliente:</label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Teléfono / Usuario:</label>
                  <input
                    type="text"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Texto del Mensaje:</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSimulating || !messageText.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                <Send className={`w-4 h-4 ${isSimulating ? 'animate-bounce' : ''}`} />
                <span>{isSimulating ? 'Simulando Ingestión & Bot IA...' : `Enviar desde ${channelMeta.name}`}</span>
              </button>
            </form>
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cerrar Probador
            </button>
          </div>
        </div>

        {/* Right: Phone Simulator Visual Mockup */}
        <div className="w-full md:w-1/2 p-6 bg-slate-950 flex flex-col items-center justify-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Smartphone Frame */}
          <div className="w-[300px] h-[520px] bg-slate-900 border-4 border-slate-700 rounded-[38px] shadow-2xl flex flex-col overflow-hidden relative">
            {/* Phone Notch */}
            <div className="w-full h-5 bg-slate-900 flex items-center justify-center">
              <div className="w-24 h-3.5 bg-slate-950 rounded-b-xl" />
            </div>

            {/* App Header (WhatsApp / IG / Messenger / Telegram skin) */}
            <div
              className="px-3.5 py-2.5 flex items-center justify-between text-white shadow"
              style={{ backgroundColor: channelMeta.color }}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                  {channelMeta.iconEmoji}
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-none">
                    {selectedChannel === 'whatsapp' ? 'WhatsApp (+51 986 150 562)' : 'NovaTech Oficial'}
                  </h4>
                  <span className="text-[9px] opacity-90 block mt-0.5">En línea • Bot IA Gemini 24/7</span>
                </div>
              </div>
            </div>

            {/* Phone Chat Messages Body */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-950/90 text-xs">
              <div className="text-center">
                <span className="px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 text-[9px]">
                  Hoy • Canal Oficial Verificado
                </span>
              </div>

              {/* Customer Sent Bubble */}
              <div className="flex justify-end">
                <div className="max-w-[210px] p-2.5 rounded-2xl rounded-tr-xs bg-emerald-600 text-white text-[11px] shadow">
                  <p>{messageText}</p>
                  <span className="text-[8px] text-emerald-200 flex justify-end mt-1">13:45 ✓✓</span>
                </div>
              </div>

              {/* Bot Response Bubble */}
              {isSimulating ? (
                <div className="flex items-center gap-1.5 text-indigo-400 text-xs italic bg-slate-900 p-2 rounded-xl border border-indigo-500/20 max-w-[180px]">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-[10px]">OmniBot escribiendo...</span>
                </div>
              ) : lastBotReply ? (
                <div className="flex justify-start animate-fadeIn">
                  <div className="max-w-[220px] p-2.5 rounded-2xl rounded-tl-xs bg-slate-800 border border-slate-700 text-slate-100 text-[11px] shadow">
                    <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 mb-1">
                      <Bot className="w-2.5 h-2.5" /> OmniBot IA (Gemini 3.7)
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{lastBotReply}</p>
                    <span className="text-[8px] text-slate-400 flex justify-end mt-1">Ahora</span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-[10px] text-slate-400 p-4 border border-dashed border-slate-800 rounded-xl">
                  Haz clic en "Enviar" para disparar la respuesta automática del Bot IA en el inbox.
                </div>
              )}
            </div>

            {/* Phone Chat Input Bar */}
            <div className="p-2 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5">
              <input
                type="text"
                disabled
                placeholder="Escribe un mensaje..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-full px-3 py-1.5 text-[10px] text-slate-400 focus:outline-none"
              />
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs"
                style={{ backgroundColor: channelMeta.color }}
              >
                <Send className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
