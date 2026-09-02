import React, { useState } from 'react';
import { 
  Radio, 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  Plus, 
  Key, 
  Globe, 
  ShieldCheck,
  Send,
  Zap,
  Code2
} from 'lucide-react';
import { ChannelConfig, ChannelType } from '../types';
import { getChannelMeta } from '../utils/channelUtils';

interface ChannelsHubViewProps {
  channels: ChannelConfig[];
  onToggleChannelBot: (id: string) => void;
  onSimulateWebhook: (channel: ChannelType, text: string) => void;
  onUpdateChannel?: (id: string, updates: Partial<ChannelConfig>) => void;
  onOpenSimulator?: () => void;
}

export const ChannelsHubView: React.FC<ChannelsHubViewProps> = ({
  channels,
  onToggleChannelBot,
  onSimulateWebhook,
  onUpdateChannel,
  onOpenSimulator
}) => {
  const [selectedChannelForConfig, setSelectedChannelForConfig] = useState<ChannelConfig | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editAccountName, setEditAccountName] = useState('');
  const [isSavedAlert, setIsSavedAlert] = useState(false);
  const [copiedWebhookId, setCopiedWebhookId] = useState<string | null>(null);
  const [testWebhookPayload, setTestWebhookPayload] = useState(
    JSON.stringify({
      channel: "whatsapp",
      senderId: "+51912345678",
      senderName: "Cliente de Prueba",
      message: "Hola, vi su publicidad y quiero cotizar los planes",
      targetNumber: "+51986150562",
      timestamp: new Date().toISOString()
    }, null, 2)
  );
  const [webhookTestResponse, setWebhookTestResponse] = useState<string | null>(null);
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);

  const handleCopyWebhook = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedWebhookId(id);
    setTimeout(() => setCopiedWebhookId(null), 2000);
  };

  const handleSendTestWebhook = async () => {
    try {
      setIsSendingWebhook(true);
      setWebhookTestResponse(null);
      const parsed = JSON.parse(testWebhookPayload);
      const res = await fetch('/api/webhooks/incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      const data = await res.json();
      setWebhookTestResponse(JSON.stringify(data, null, 2));
      
      // Also trigger in UI state
      onSimulateWebhook(parsed.channel || 'whatsapp', parsed.message || 'Mensaje de prueba');
    } catch (err: any) {
      setWebhookTestResponse(JSON.stringify({ error: err.message || 'JSON inválido o error en servidor' }, null, 2));
    } finally {
      setIsSendingWebhook(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 h-full overflow-hidden">
      {/* Header */}
      <div className="p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-extrabold text-white font-['Outfit']">
              Centro de Conexión & Pasarela de Canales
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Conecta WhatsApp Cloud API, Instagram Direct, Messenger, Telegram, TikTok y Webhooks para centralizar toda tu mensajería.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {channels.filter(c => c.status === 'connected').length} de {channels.length} Canales Activos
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Channel Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {channels.map((chan) => {
            const meta = getChannelMeta(chan.type);
            const isConnected = chan.status === 'connected';

            return (
              <div
                key={chan.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-md flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-md"
                        style={{ backgroundColor: chan.color }}
                      >
                        {meta.iconEmoji}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">{chan.name}</h3>
                        <p className="text-xs text-slate-400 font-mono">{chan.handleOrPhone}</p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isConnected
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    }`}>
                      {isConnected ? 'Conectado' : 'Pendiente'}
                    </span>
                  </div>

                  {/* Channel Metrics & Status */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Cuenta Oficial:</span>
                      <span className="font-semibold text-slate-200 truncate max-w-[140px]">{chan.accountName}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Mensajes Procesados:</span>
                      <span className="font-mono font-bold text-emerald-400">{chan.messagesCount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Última Actividad:</span>
                      <span className="text-slate-300">{chan.lastActive}</span>
                    </div>
                  </div>
                </div>

                {/* Channel Actions */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Bot IA Autónomo:</span>
                    <button
                      onClick={() => onToggleChannelBot(chan.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-all ${
                        chan.botEnabled
                          ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {chan.botEnabled ? '🤖 Activo' : 'Pausado'}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedChannelForConfig(chan);
                      setEditPhone(chan.handleOrPhone);
                      setEditAccountName(chan.accountName);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
                  >
                    <Key className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Configurar Canal & Webhook</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Webhook Simulator Gateway */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Pasarela de Webhooks en Tiempo Real (REST API Gateway)</h3>
                <p className="text-xs text-slate-400">
                  Prueba la recepción de payloads JSON desde WhatsApp Business Cloud API, Meta Graph API o servicios externos (Zapier, Make, CRM).
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
              POST /api/webhooks/incoming
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Input Payload */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Payload JSON del Mensaje Entrante:
              </label>
              <textarea
                value={testWebhookPayload}
                onChange={(e) => setTestWebhookPayload(e.target.value)}
                rows={7}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleSendTestWebhook}
                disabled={isSendingWebhook}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingWebhook ? 'Enviando al Backend...' : 'Disparar Webhook de Prueba'}</span>
              </button>
            </div>

            {/* Server Response */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Respuesta del Servidor (ACK & Status):
              </label>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 h-[178px] overflow-y-auto">
                {webhookTestResponse ? (
                  <pre className="text-emerald-400 whitespace-pre-wrap">{webhookTestResponse}</pre>
                ) : (
                  <span className="text-slate-500 italic">Haz clic en "Disparar Webhook de Prueba" para ver el procesamiento del servidor...</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Configuration Modal */}
      {selectedChannelForConfig && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm"
                  style={{ backgroundColor: selectedChannelForConfig.color }}
                >
                  {getChannelMeta(selectedChannelForConfig.type).iconEmoji}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedChannelForConfig.name}</h3>
                  <p className="text-xs text-slate-400">{selectedChannelForConfig.accountName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedChannelForConfig(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Número Telefónico o Identificador de Cuenta Conectada:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+51 986 150 562"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => {
                      if (onUpdateChannel && selectedChannelForConfig) {
                        onUpdateChannel(selectedChannelForConfig.id, {
                          handleOrPhone: editPhone,
                          accountName: editAccountName || selectedChannelForConfig.accountName
                        });
                        setIsSavedAlert(true);
                        setTimeout(() => setIsSavedAlert(false), 2500);
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    Guardar
                  </button>
                </div>
                {isSavedAlert && (
                  <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ¡Número actualizado correctamente!
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Webhook URL de Callback (Para Meta Developer / BotFather)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={selectedChannelForConfig.webhookUrl}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs focus:outline-none"
                  />
                  <button
                    onClick={() => handleCopyWebhook(selectedChannelForConfig.id, selectedChannelForConfig.webhookUrl)}
                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
                    title="Copiar URL"
                  >
                    {copiedWebhookId === selectedChannelForConfig.id ? (
                      <Check className="w-4 h-4 text-emerald-300" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Estado de la API & Seguridad:</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Conexión cifrada de punto a punto (TLS 1.3). Tokens de acceso y Webhook Verify Token verificados automáticamente con la API de Meta / Telegram.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                {onOpenSimulator && (
                  <button
                    onClick={() => {
                      setSelectedChannelForConfig(null);
                      onOpenSimulator();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 text-xs font-bold flex items-center gap-1.5"
                  >
                    <span>⚡ Probar con Simulador</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedChannelForConfig(null)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold ml-auto"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
