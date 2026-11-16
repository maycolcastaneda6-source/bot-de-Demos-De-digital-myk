import React, { useState, useEffect, useRef } from 'react';
import { 
  Smartphone, 
  X, 
  Send, 
  Bot, 
  Sparkles, 
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { ChannelType, QuickLeadScenario, SalesInteractiveButton } from '../types';
import { leadScenarios } from '../data/initialData';
import { getChannelMeta } from '../utils/channelUtils';

interface SimulatorResponse {
  reply: string;
  buttons?: SalesInteractiveButton[];
}

interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTargetLine?: 'demos' | 'sales';
  onSendSimulatedMessage: (
    channel: ChannelType,
    senderName: string,
    senderPhone: string,
    avatar: string,
    messageText: string,
    targetLine?: 'demos' | 'sales'
  ) => Promise<string | SimulatorResponse | void>;
}

interface ChatBubble {
  sender: 'user' | 'bot';
  text: string;
  buttons?: SalesInteractiveButton[];
  time: string;
}

export const SimulatorModal: React.FC<SimulatorModalProps> = ({
  isOpen,
  onClose,
  initialTargetLine = 'sales',
  onSendSimulatedMessage
}) => {
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>('whatsapp');
  const [targetLine, setTargetLine] = useState<'demos' | 'sales'>(initialTargetLine);
  const [senderName, setSenderName] = useState('Luis Navarro');
  const [senderPhone, setSenderPhone] = useState('+51 944 888 111');
  const [messageText, setMessageText] = useState('Hola');
  const [isSimulating, setIsSimulating] = useState(false);
  const [chatThread, setChatThread] = useState<ChatBubble[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTargetLine(initialTargetLine);
      setChatThread([]);
      if (initialTargetLine === 'sales') {
        setSelectedChannel('whatsapp');
        setMessageText('Hola');
      }
    }
  }, [isOpen, initialTargetLine]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatThread, isSimulating]);

  if (!isOpen) return null;

  const channelMeta = getChannelMeta(selectedChannel);

  const handleApplyScenario = (scenario: QuickLeadScenario) => {
    setSelectedChannel(scenario.channel);
    if (scenario.targetLine) {
      setTargetLine(scenario.targetLine);
    }
    setSenderName(scenario.senderName);
    setSenderPhone(scenario.senderPhone);
    setMessageText(scenario.message);
    setChatThread([]);
  };

  const dispatchMessage = async (textToSend: string, displayLabel?: string) => {
    if (!textToSend.trim() || isSimulating) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const visibleUserText = displayLabel || textToSend;

    setChatThread(prev => [...prev, { sender: 'user', text: visibleUserText, time: nowTime }]);

    try {
      setIsSimulating(true);
      const avatar = `https://images.unsplash.com/photo-${
        selectedChannel === 'whatsapp' ? '1534528741775-53994a69daeb' : '1507003211169-0a1dd7228f2d'
      }?w=150&auto=format&fit=crop&q=80`;

      const result = await onSendSimulatedMessage(
        selectedChannel,
        senderName,
        senderPhone,
        avatar,
        textToSend,
        targetLine
      );

      if (result) {
        const replyText = typeof result === 'string' ? result : result.reply;
        const buttons = typeof result === 'string' ? undefined : result.buttons;
        setChatThread(prev => [
          ...prev,
          {
            sender: 'bot',
            text: replyText,
            buttons,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const txt = messageText;
    setMessageText('');
    await dispatchMessage(txt);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] animate-scaleUp">
        {/* Left: Configuration & Scenario Presets */}
        <div className="w-full md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between overflow-y-auto space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-cyan-400" />
                <h3 className="font-extrabold text-white text-base font-['Outfit']">
                  {targetLine === 'sales' ? 'Canal Comercial Digital MYK Lab' : 'Central WhatsApp Multi-Línea'}
                </h3>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Botones Interactivos
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Prueba la experiencia real con botones interactivos tal como la ven tus clientes en WhatsApp y verifica cómo se actualiza el CRM PRO al instante.
            </p>

            {/* Connected Number Selector */}
            <div className="mt-3 p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                Línea WhatsApp Destino:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChannel('whatsapp');
                    setTargetLine('sales');
                    setChatThread([]);
                    setMessageText('Hola');
                  }}
                  className={`p-2 rounded-lg text-left border transition-all ${
                    targetLine === 'sales'
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[11px] font-bold">🚀 Digital MYK Lab</div>
                  <div className="text-[10px] font-mono">+51 929 327 654</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChannel('whatsapp');
                    setTargetLine('demos');
                    setChatThread([]);
                  }}
                  className={`p-2 rounded-lg text-left border transition-all ${
                    targetLine === 'demos'
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[11px] font-bold">📱 Soluciones Clínicas</div>
                  <div className="text-[10px] font-mono">+51 986 150 562</div>
                </button>
              </div>
            </div>

            {/* Scenarios 1-Click buttons */}
            <div className="mt-4 space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Consultas Rápidas de Clientes:
              </label>
              <div className="grid grid-cols-1 gap-2">
                {leadScenarios.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => handleApplyScenario(sc)}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm">{getChannelMeta(sc.channel).iconEmoji}</span>
                      <div>
                        <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">
                          {sc.title}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[230px]">
                          {sc.senderName}: "{sc.message}"
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input Form */}
            <form onSubmit={handleSend} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Nombre del Cliente:</label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">WhatsApp del Cliente:</label>
                  <input
                    type="text"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Mensaje Entrante:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Escribe cualquier palabra (ej. Hola)..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={isSimulating || !messageText.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={() => setChatThread([])}
              className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reiniciar chat
            </button>
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cerrar ventana
            </button>
          </div>
        </div>

        {/* Right: Interactive WhatsApp Phone Preview */}
        <div className="w-full md:w-1/2 p-6 bg-slate-950 flex flex-col items-center justify-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Smartphone Frame */}
          <div className="w-[310px] h-[540px] bg-slate-900 border-4 border-slate-700 rounded-[38px] shadow-2xl flex flex-col overflow-hidden relative">
            {/* Phone Notch */}
            <div className="w-full h-5 bg-slate-900 flex items-center justify-center">
              <div className="w-24 h-3.5 bg-slate-950 rounded-b-xl" />
            </div>

            {/* App Header */}
            <div
              className="px-3.5 py-2.5 flex items-center justify-between text-white shadow"
              style={{ backgroundColor: targetLine === 'sales' ? '#075E54' : channelMeta.color }}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-950 border border-white/30 overflow-hidden flex items-center justify-center font-bold text-xs">
                  {targetLine === 'sales' ? (
                    <img src="/digital_myk_logo.jpg" alt="MYK" className="w-full h-full object-cover" />
                  ) : (
                    channelMeta.iconEmoji
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-none">
                    {selectedChannel === 'whatsapp'
                      ? (targetLine === 'sales' ? 'Digital MYK Lab (+51 929 327 654)' : 'WhatsApp (+51 986 150 562)')
                      : 'Digital MYK Lab Oficial'}
                  </h4>
                  <span className="text-[9px] opacity-90 block mt-0.5">
                    {targetLine === 'sales' ? 'Empresa verificada • Asesor Comercial' : 'En línea • Asistente IA 24/7'}
                  </span>
                </div>
              </div>
            </div>

            {/* Phone Chat Messages Body */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#0b141a] text-xs">
              <div className="text-center">
                <span className="px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 text-[9px]">
                  Canal Oficial • Cifrado de extremo a extremo
                </span>
              </div>

              {chatThread.length === 0 && !isSimulating && (
                <div className="text-center text-[10px] text-slate-400 p-4 border border-dashed border-slate-800 rounded-xl mt-6">
                  Envía <strong className="text-cyan-300">"Hola"</strong> para ver la bienvenida ejecutiva con botones interactivos que tus clientes tocan sin escribir.
                </div>
              )}

              {chatThread.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.sender === 'user' ? (
                    <div className="max-w-[220px] p-2.5 rounded-2xl rounded-tr-xs bg-[#005c4b] text-white text-[11px] shadow">
                      <p>{msg.text}</p>
                      <span className="text-[8px] text-emerald-200 flex justify-end mt-1">{msg.time} ✓✓</span>
                    </div>
                  ) : (
                    <div className="max-w-[245px] space-y-1.5">
                      <div className="p-2.5 rounded-2xl rounded-tl-xs bg-[#202c33] border border-slate-700/60 text-slate-100 text-[11px] shadow">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-cyan-400 mb-1">
                          <Bot className="w-2.5 h-2.5" /> Digital MYK Lab Oficial
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        <span className="text-[8px] text-slate-400 flex justify-end mt-1">{msg.time}</span>
                      </div>

                      {/* Real Clickable WhatsApp Buttons */}
                      {msg.buttons && msg.buttons.length > 0 && idx === chatThread.length - 1 && (
                        <div className="space-y-1 pt-0.5">
                          {msg.buttons.map((btn) => (
                            <button
                              key={btn.buttonId}
                              type="button"
                              disabled={isSimulating}
                              onClick={() => dispatchMessage(btn.buttonId, btn.buttonText)}
                              className="w-full py-2 px-3 rounded-xl bg-[#202c33] hover:bg-[#2a3942] border border-cyan-500/30 text-cyan-300 font-semibold text-[11px] text-center shadow transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                            >
                              {btn.buttonText}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {isSimulating && (
                <div className="flex items-center gap-1.5 text-cyan-400 text-xs italic bg-[#202c33] p-2 rounded-xl border border-cyan-500/20 max-w-[180px]">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-[10px]">Respondiendo...</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Phone Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!messageText.trim()) return;
                const txt = messageText;
                setMessageText('');
                dispatchMessage(txt);
              }}
              className="p-2 bg-[#202c33] border-t border-slate-800 flex items-center gap-1.5"
            >
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Escribe o usa los botones..."
                className="flex-1 bg-[#2a3942] border border-slate-700 rounded-full px-3 py-1.5 text-[10px] text-slate-100 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSimulating || !messageText.trim()}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs bg-[#00a884] disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
