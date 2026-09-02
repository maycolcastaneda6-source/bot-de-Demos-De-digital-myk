import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  Cpu, 
  Sliders, 
  BookOpen, 
  Workflow, 
  Plus, 
  Check, 
  Trash2, 
  Play, 
  AlertCircle, 
  ShieldCheck, 
  Zap, 
  Save, 
  ToggleLeft, 
  ToggleRight,
  MessageSquare,
  Clock,
  Flame,
  HelpCircle
} from 'lucide-react';
import { BotSettings, AutomationRule, ChannelType } from '../types';
import { getChannelMeta } from '../utils/channelUtils';

interface AutomationsViewProps {
  botSettings: BotSettings;
  onUpdateBotSettings: (settings: BotSettings) => void;
  rules: AutomationRule[];
  onToggleRule: (id: string) => void;
  onAddRule: (rule: AutomationRule) => void;
  onDeleteRule: (id: string) => void;
}

export const AutomationsView: React.FC<AutomationsViewProps> = ({
  botSettings,
  onUpdateBotSettings,
  rules,
  onToggleRule,
  onAddRule,
  onDeleteRule
}) => {
  const [activeTab, setActiveTab] = useState<'bot' | 'rules'>('bot');
  const [formData, setFormData] = useState<BotSettings>(botSettings);
  const [isSaved, setIsSaved] = useState(false);
  
  // Rule Creation Modal State
  const [showNewRuleModal, setShowNewRuleModal] = useState(false);
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRuleChannel, setNewRuleChannel] = useState<ChannelType | 'all'>('all');
  const [newRuleTrigger, setNewRuleTrigger] = useState<any>('keyword');
  const [newRuleTriggerValue, setNewRuleTriggerValue] = useState('');
  const [newRuleAction, setNewRuleAction] = useState<any>('send_template');
  const [newRuleActionPayload, setNewRuleActionPayload] = useState('');

  // Live Playground Test State
  const [testUserMsg, setTestUserMsg] = useState('Hola, ¿cuánto cuesta el plan para 5 usuarios y qué incluye?');
  const [testBotReply, setTestBotReply] = useState<string | null>(null);
  const [isTestingBot, setIsTestingBot] = useState(false);

  const handleSaveSettings = () => {
    onUpdateBotSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleTestBot = async () => {
    try {
      setIsTestingBot(true);
      setTestBotReply(null);
      const res = await fetch('/api/ai/chat-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ sender: 'customer', text: testUserMsg }],
          channel: 'WhatsApp',
          contactName: 'Cliente Demo',
          systemPrompt: formData.systemPrompt,
          knowledgeBase: formData.knowledgeBase,
          agentRole: 'bot',
          tone: formData.tone
        })
      });
      const data = await res.json();
      setTestBotReply(data.reply || 'Respuesta generada');
    } catch (err) {
      console.error(err);
      setTestBotReply('Error al conectar con Gemini. Verifique su configuración.');
    } finally {
      setIsTestingBot(false);
    }
  };

  const handleCreateRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleTitle.trim()) return;

    const newRule: AutomationRule = {
      id: `rule_${Date.now()}`,
      title: newRuleTitle,
      description: newRuleDesc || 'Regla de automatización omnicanal',
      isActive: true,
      channel: newRuleChannel,
      trigger: newRuleTrigger,
      triggerValue: newRuleTriggerValue,
      action: newRuleAction,
      actionPayload: newRuleActionPayload || 'Ejecución estándar',
      executionsCount: 0
    };

    onAddRule(newRule);
    setShowNewRuleModal(false);
    setNewRuleTitle('');
    setNewRuleDesc('');
    setNewRuleTriggerValue('');
    setNewRuleActionPayload('');
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 h-full overflow-hidden">
      {/* Header */}
      <div className="p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-extrabold text-white font-['Outfit']">
              Motor de Automatización & Bot IA Gemini
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Configura el Asistente IA 24/7, la base de conocimiento y los flujos automáticos para WhatsApp, Instagram, Messenger y más.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('bot')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'bot'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Configuración Bot IA</span>
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'rules'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Reglas & Disparadores ({rules.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'bot' ? (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Master Activation Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/30 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-indigo-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    OmniBot IA Autónomo (Gemini 3.7 Flash)
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                      PRODUCCIÓN
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Responde mensajes entrantes de clientes en tiempo real respetando la base de conocimiento y horarios.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    formData.enabled
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <span>{formData.enabled ? 'BOT ACTIVADO 24/7' : 'BOT DESACTIVADO'}</span>
                </button>
              </div>
            </div>

            {/* Two Column Layout: Editor & Live Playground */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form & Knowledge Base */}
              <div className="lg:col-span-7 space-y-5">
                {/* Bot Persona & Tone */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    Personalidad & Tono de Comunicación
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Nombre del Asistente</label>
                      <input
                        type="text"
                        value={formData.botName}
                        onChange={(e) => setFormData({ ...formData, botName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Tono de Voz</label>
                      <select
                        value={formData.tone}
                        onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Profesional, cercano y resolutivo">Profesional y Cercano</option>
                        <option value="Comercial y altamente persuasivo para ventas">Comercial & Persuasivo (Ventas)</option>
                        <option value="Formal, elegante y corporativo">Corporativo / VIP Formal</option>
                        <option value="Amigable, fresco y moderno con emojis">Fresco y Juvenil (E-commerce)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">
                      Instrucciones del Sistema (System Prompt)
                    </label>
                    <textarea
                      value={formData.systemPrompt}
                      onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                      rows={4}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed font-mono"
                      placeholder="Instrucciones de cómo el bot debe comportarse, saludar y calificar..."
                    />
                  </div>
                </div>

                {/* Business Knowledge Base Editor */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-emerald-400" />
                      Base de Conocimiento del Negocio (FAQ & Catálogo)
                    </h4>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                      RAG Context
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Incluye aquí los productos, precios, políticas de garantía, envíos, métodos de pago y preguntas frecuentes. La IA consultará estos datos para responder con 100% de precisión.
                  </p>
                  <textarea
                    value={formData.knowledgeBase}
                    onChange={(e) => setFormData({ ...formData, knowledgeBase: e.target.value })}
                    rows={8}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed font-mono"
                    placeholder="Escribe la información de tu negocio..."
                  />
                </div>

                {/* Handoff Keywords */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    Palabras Clave de Transferencia a Humano (Smart Handoff)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Si el cliente escribe alguna de estas palabras, el bot se pausa automáticamente y alerta a un asesor humano.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.handoffKeywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 text-xs font-mono flex items-center gap-1"
                      >
                        <span>"{kw}"</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveSettings}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-600/30 transition-all"
                >
                  {isSaved ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>¡Configuración Guardada con Éxito!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Cambios de IA</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right Column: Live Testing Simulator */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/30 space-y-4 sticky top-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Probador de Respuestas en Vivo
                      </h4>
                    </div>
                    <span className="text-[10px] text-slate-400">Gemini 3.7</span>
                  </div>

                  <p className="text-xs text-slate-400">
                    Escribe como un cliente para probar cómo responderá tu bot con las instrucciones y base de conocimiento actuales:
                  </p>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 block">Mensaje de Prueba del Cliente:</label>
                    <textarea
                      value={testUserMsg}
                      onChange={(e) => setTestUserMsg(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    onClick={handleTestBot}
                    disabled={isTestingBot || !testUserMsg.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:opacity-95 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                  >
                    <Play className={`w-3.5 h-3.5 ${isTestingBot ? 'animate-spin' : ''}`} />
                    <span>{isTestingBot ? 'Consultando a Gemini 3.7...' : 'Simular Respuesta de Bot'}</span>
                  </button>

                  {testBotReply && (
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between text-[11px] font-bold text-indigo-300">
                        <span className="flex items-center gap-1">
                          <Bot className="w-3.5 h-3.5 text-emerald-400" />
                          Respuesta Generada por el Bot:
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">0.4s</span>
                      </div>
                      <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {testBotReply}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: Rules & Triggers */
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Reglas y Flujos de Automatización</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Crea disparadores condicionales para calificar leads, mover etapas en CRM y alertar a agentes.
                </p>
              </div>

              <button
                onClick={() => setShowNewRuleModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Regla</span>
              </button>
            </div>

            {/* Rules List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.map((rule) => {
                const channelMeta = getChannelMeta(rule.channel === 'all' ? 'whatsapp' : rule.channel);

                return (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                      rule.isActive
                        ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50 shadow-md'
                        : 'bg-slate-900/40 border-slate-800/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-white">{rule.title}</h4>
                          <span className="text-[10px] text-slate-400">
                            Canal: {rule.channel === 'all' ? 'Todos los Canales' : rule.channel}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onToggleRule(rule.id)}
                        className={`text-xs px-2.5 py-1 rounded-full font-bold border transition-all ${
                          rule.isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {rule.isActive ? 'Activa' : 'Pausada'}
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{rule.description}</p>

                    {/* Trigger & Action Details */}
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-indigo-300">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">SI (Trigger):</span>
                        <span>{rule.triggerValue ? `Contiene "${rule.triggerValue}"` : rule.trigger}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-300">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">ENTONCES (Acción):</span>
                        <span className="truncate">{rule.actionPayload}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                      <span>Ejecutada: <strong>{rule.executionsCount} veces</strong></span>
                      <button
                        onClick={() => onDeleteRule(rule.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        title="Eliminar regla"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* New Rule Modal */}
      {showNewRuleModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-6 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-400" />
                Crear Nueva Regla de Automatización
              </h3>
              <button
                onClick={() => setShowNewRuleModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRuleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre de la Regla</label>
                <input
                  type="text"
                  required
                  value={newRuleTitle}
                  onChange={(e) => setNewRuleTitle(e.target.value)}
                  placeholder="ej. Auto-calificar lead cuando pregunte precio"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Canal Aplicable</label>
                <select
                  value={newRuleChannel}
                  onChange={(e) => setNewRuleChannel(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">Todos los Canales (Omnicanal)</option>
                  <option value="whatsapp">WhatsApp Business API</option>
                  <option value="instagram">Instagram Direct DMs</option>
                  <option value="messenger">Facebook Messenger</option>
                  <option value="telegram">Telegram Bot</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Disparador (Trigger)</label>
                  <select
                    value={newRuleTrigger}
                    onChange={(e) => setNewRuleTrigger(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="keyword">Palabras Clave en Mensaje</option>
                    <option value="new_conversation">Nueva Conversación (Primer Mensaje)</option>
                    <option value="sentiment_negative">Sentimiento Negativo / Reclamo</option>
                    <option value="offline_hours">Fuera de Horario Laboral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Acción Resultante</label>
                  <select
                    value={newRuleAction}
                    onChange={(e) => setNewRuleAction(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="move_crm_stage">Mover Etapa en CRM</option>
                    <option value="trigger_ai_bot">Activar Bot Autónomo IA</option>
                    <option value="assign_agent">Asignar a Asesor Humano</option>
                    <option value="add_tag">Añadir Etiqueta / Tag</option>
                    <option value="webhook_zapier">Enviar Webhook a Zapier/Make</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Valor del Disparador o Palabras Clave</label>
                <input
                  type="text"
                  value={newRuleTriggerValue}
                  onChange={(e) => setNewRuleTriggerValue(e.target.value)}
                  placeholder="ej. precio, costo, cotización, catálogo"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Detalle de la Acción</label>
                <input
                  type="text"
                  value={newRuleActionPayload}
                  onChange={(e) => setNewRuleActionPayload(e.target.value)}
                  placeholder="ej. Mover a Calificado y añadir tag #LeadInteresado"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewRuleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Guardar y Activar Regla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
