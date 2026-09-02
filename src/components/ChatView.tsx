import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  Paperclip, 
  Mic, 
  Smile, 
  Lock, 
  CheckCheck, 
  Check, 
  MoreVertical, 
  Flame, 
  Info, 
  Volume2, 
  Play, 
  Pause, 
  RefreshCw, 
  ChevronDown, 
  Layers, 
  Wand2, 
  FileText, 
  Globe, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  MessageSquare,
  Zap,
  PhoneCall
} from 'lucide-react';
import { Conversation, Message, DealStage, SentimentType } from '../types';
import { getChannelMeta, getSentimentMeta, getDealStageColor } from '../utils/channelUtils';

interface ChatViewProps {
  conversation: Conversation;
  onSendMessage: (text: string, isPrivateNote?: boolean, mediaType?: 'image' | 'audio' | 'document') => void;
  onToggleBot: (id: string) => void;
  onUpdateDealStage: (id: string, stage: DealStage) => void;
  onToggleCRMDrawer: () => void;
  onOpenCannedResponses: () => void;
  cannedInsertText?: string;
  onClearCannedInsert?: () => void;
  botSettings: any;
  onAnalyzeWithAI: (id: string) => void;
  isAnalyzingAI: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({
  conversation,
  onSendMessage,
  onToggleBot,
  onUpdateDealStage,
  onToggleCRMDrawer,
  onOpenCannedResponses,
  cannedInsertText,
  onClearCannedInsert,
  botSettings,
  onAnalyzeWithAI,
  isAnalyzingAI
}) => {
  const [inputText, setInputText] = useState('');
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [isGeneratingAiReply, setIsGeneratingAiReply] = useState(false);
  const [showAiToolbar, setShowAiToolbar] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [showStageDropdown, setShowStageDropdown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const channelMeta = getChannelMeta(conversation.channel);
  const sentimentMeta = getSentimentMeta(conversation.sentiment);
  const stageStyle = getDealStageColor(conversation.dealStage);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

  // Insert canned text if selected
  useEffect(() => {
    if (cannedInsertText) {
      setInputText(prev => prev ? `${prev}\n${cannedInsertText}` : cannedInsertText);
      onClearCannedInsert?.();
      textareaRef.current?.focus();
    }
  }, [cannedInsertText, onClearCannedInsert]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), isPrivateNote);
    setInputText('');
    setIsPrivateNote(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Generate Smart Reply with Gemini API via backend
  const handleGenerateAiSmartReply = async () => {
    try {
      setIsGeneratingAiReply(true);
      const res = await fetch('/api/ai/chat-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversation.messages,
          channel: channelMeta.name,
          contactName: conversation.contactName,
          systemPrompt: botSettings.systemPrompt,
          knowledgeBase: botSettings.knowledgeBase,
          agentRole: 'copilot',
          tone: botSettings.tone
        })
      });
      const data = await res.json();
      if (data.reply) {
        setInputText(data.reply);
        textareaRef.current?.focus();
      }
    } catch (err) {
      console.error('Error generating AI reply:', err);
    } finally {
      setIsGeneratingAiReply(false);
    }
  };

  // Enhance Text with AI (improve tone, formalize, translate)
  const handleEnhanceText = async (action: string, targetLanguage?: string) => {
    if (!inputText.trim()) return;
    try {
      setIsGeneratingAiReply(true);
      const res = await fetch('/api/ai/enhance-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          action,
          targetLanguage
        })
      });
      const data = await res.json();
      if (data.enhancedText) {
        setInputText(data.enhancedText);
      }
    } catch (err) {
      console.error('Error enhancing text:', err);
    } finally {
      setIsGeneratingAiReply(false);
    }
  };

  // Simulate Voice Note send
  const handleSendVoiceNote = () => {
    onSendMessage('Nota de voz grabada por el asesor (0:14s)', false, 'audio');
  };

  const stages: DealStage[] = [
    'Prospecto',
    'Calificado',
    'Propuesta',
    'Negociación',
    'Cerrado Ganado',
    'Soporte'
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-950 h-full overflow-hidden relative">
      {/* Top Header */}
      <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between flex-shrink-0 z-10">
        {/* Contact Info */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={conversation.contactAvatar}
              alt={conversation.contactName}
              className="w-10 h-10 rounded-full object-cover border border-slate-700 bg-slate-800"
            />
            <span
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] shadow border border-slate-900"
              style={{ backgroundColor: channelMeta.color }}
            >
              <span className="text-white">{channelMeta.iconEmoji}</span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                {conversation.contactName}
              </h2>
              {conversation.contactCompany && (
                <span className="text-[11px] text-slate-400 font-normal">
                  • {conversation.contactCompany}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono text-[11px]">{conversation.contactHandleOrPhone}</span>
              <span>•</span>
              <span className={`px-1.5 py-0.2 rounded border text-[10px] font-medium ${channelMeta.badgeBg}`}>
                {channelMeta.name}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* AI Bot Toggle Switch */}
          <button
            onClick={() => onToggleBot(conversation.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              conversation.botActive
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/10'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title={conversation.botActive ? 'Bot IA respondiendo activamente con Gemini' : 'Activar Bot Autónomo'}
          >
            <Bot className={`w-4 h-4 ${conversation.botActive ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <span>{conversation.botActive ? 'Bot IA Activo' : 'Pausar Bot'}</span>
            <span className={`w-2 h-2 rounded-full ${conversation.botActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          </button>

          {/* Deal Stage Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowStageDropdown(!showStageDropdown)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${stageStyle}`}
            >
              <span>Etapa: <strong>{conversation.dealStage}</strong></span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {showStageDropdown && (
              <div className="absolute right-0 mt-1.5 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1 z-30 divide-y divide-slate-800">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400">
                  Mover en Embudo CRM
                </div>
                {stages.map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      onUpdateDealStage(conversation.id, st);
                      setShowStageDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                      conversation.dealStage === st ? 'text-indigo-400 font-bold bg-slate-800/60' : 'text-slate-300'
                    }`}
                  >
                    <span>{st}</span>
                    {conversation.dealStage === st && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AI Analyze / Insights Button */}
          <button
            onClick={() => onAnalyzeWithAI(conversation.id)}
            disabled={isAnalyzingAI}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition-all disabled:opacity-50"
            title="Analizar sentimiento, intención y lead score con Gemini"
          >
            <Sparkles className={`w-3.5 h-3.5 text-indigo-400 ${isAnalyzingAI ? 'animate-spin' : ''}`} />
            <span>{isAnalyzingAI ? 'Analizando...' : 'Analizar con IA'}</span>
          </button>

          {/* Toggle CRM Drawer */}
          <button
            onClick={onToggleCRMDrawer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-all"
            title="Ver ficha completa de cliente y notas de ventas"
          >
            <Info className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Ficha CRM</span>
          </button>
        </div>
      </div>

      {/* AI Customer Summary Card (if available) */}
      {conversation.summary && (
        <div className="bg-slate-900/60 border-b border-indigo-500/20 px-5 py-2 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2 truncate">
            <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-indigo-300 flex-shrink-0">Resumen IA:</span>
            <span className="truncate text-slate-300">{conversation.summary}</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 ml-4 text-[11px]">
            <span className="text-slate-400">
              Score: <strong className="text-emerald-400">{conversation.leadScore}/100</strong>
            </span>
            <span className={`px-2 py-0.5 rounded border text-[10px] ${sentimentMeta.color}`}>
              {sentimentMeta.icon} {sentimentMeta.label}
            </span>
          </div>
        </div>
      )}

      {/* Message History Stream */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {conversation.messages.map((msg, idx) => {
          const isCustomer = msg.sender === 'customer';
          const isBot = msg.sender === 'bot';
          const isAgent = msg.sender === 'agent';
          const isNote = msg.isPrivateNote;

          if (isNote) {
            return (
              <div key={msg.id || idx} className="max-w-xl mx-auto my-3">
                <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3.5 text-amber-200 text-xs shadow-md">
                  <div className="flex items-center justify-between font-bold text-amber-300 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      Nota Interna del Asesor (Privada)
                    </span>
                    <span className="text-[10px] font-mono text-amber-400/80">{msg.timestamp}</span>
                  </div>
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id || idx}
              className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                {isCustomer ? (
                  <span>{conversation.contactName}</span>
                ) : isBot ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <Bot className="w-3 h-3" /> OmniBot IA (Gemini 3.7)
                  </span>
                ) : (
                  <span>{msg.authorName || 'Maycol Castañeda (Agente)'}</span>
                )}
                <span className="text-[10px] font-mono text-slate-400">• {msg.timestamp}</span>
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-lg rounded-2xl px-4 py-2.5 text-sm shadow-md leading-relaxed ${
                  isCustomer
                    ? 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-sm'
                    : isBot
                    ? 'bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-500/40 text-slate-100 rounded-tr-sm shadow-indigo-500/5'
                    : 'bg-indigo-600 text-white rounded-tr-sm'
                }`}
              >
                {/* Media Audio Preview */}
                {msg.mediaType === 'audio' && (
                  <div className="mb-2 p-2 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center gap-3">
                    <button
                      onClick={() => setPlayingAudioId(playingAudioId === msg.id ? null : msg.id)}
                      className="w-8 h-8 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center flex-shrink-0"
                    >
                      {playingAudioId === msg.id ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-1 h-4">
                        {[40, 70, 30, 90, 60, 80, 50, 95, 40, 60, 80, 30, 70, 50, 90].map((h, i) => (
                          <span
                            key={i}
                            className={`w-1 rounded-full transition-all ${
                              playingAudioId === msg.id ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'
                            }`}
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">0:14s • Audio</span>
                    </div>
                  </div>
                )}

                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Delivery checkmarks for agent/bot */}
                {!isCustomer && (
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-indigo-200">
                    <CheckCheck className="w-3.5 h-3.5 text-indigo-300" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* AI Copilot Suggestion Bar */}
      <div className="px-5 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={handleGenerateAiSmartReply}
            disabled={isGeneratingAiReply}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAiReply ? 'animate-spin' : ''}`} />
            <span>{isGeneratingAiReply ? 'Generando con Gemini...' : 'Sugerir Respuesta IA'}</span>
          </button>

          <button
            onClick={() => handleEnhanceText('improve_tone')}
            disabled={!inputText.trim() || isGeneratingAiReply}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all disabled:opacity-40"
            title="Mejorar redacción y tono"
          >
            ✨ Mejorar Redacción
          </button>

          <button
            onClick={() => handleEnhanceText('formal')}
            disabled={!inputText.trim() || isGeneratingAiReply}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all disabled:opacity-40"
            title="Tono formal corporativo"
          >
            👔 Formal
          </button>

          <button
            onClick={() => handleEnhanceText('friendly')}
            disabled={!inputText.trim() || isGeneratingAiReply}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all disabled:opacity-40"
            title="Tono cálido y alegre"
          >
            😊 Amigable
          </button>

          <button
            onClick={() => handleEnhanceText('translate', 'inglés')}
            disabled={!inputText.trim() || isGeneratingAiReply}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all disabled:opacity-40 flex items-center gap-1"
            title="Traducir a inglés"
          >
            <Globe className="w-3 h-3 text-slate-400" />
            <span>A Inglés</span>
          </button>
        </div>

        {/* Quick Canned shortcut hint */}
        <button
          onClick={onOpenCannedResponses}
          className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Plantillas Rápidas ( / )</span>
        </button>
      </div>

      {/* Input Composer */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-2">
        {/* Mode Selector: Direct Message vs Internal Private Note */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrivateNote(false)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                !isPrivateNote
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Mensaje al Cliente ({channelMeta.name})</span>
            </button>

            <button
              onClick={() => setIsPrivateNote(true)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                isPrivateNote
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Nota Interna Privada</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400">
            Presiona <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">Enter</kbd> para enviar
          </span>
        </div>

        {/* Text Area & Action Bar */}
        <div className={`relative rounded-2xl border transition-all ${
          isPrivateNote 
            ? 'bg-amber-950/20 border-amber-500/50 ring-1 ring-amber-500/20' 
            : 'bg-slate-950 border-slate-800 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50'
        }`}>
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isPrivateNote
                ? 'Escribe una nota interna sobre este cliente (solo visible para tu equipo)...'
                : `Escribe una respuesta para ${conversation.contactName} o usa "/" para respuestas rápidas...`
            }
            rows={2}
            className="w-full px-4 pt-3 pb-12 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none"
          />

          {/* Bottom Toolbar inside composer */}
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-400">
              <button
                type="button"
                onClick={onOpenCannedResponses}
                className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-slate-200 transition-colors"
                title="Insertar Respuesta Rápida"
              >
                <Zap className="w-4 h-4 text-amber-400" />
              </button>

              <button
                type="button"
                onClick={handleSendVoiceNote}
                className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-slate-200 transition-colors"
                title="Grabar y Enviar Nota de Voz"
              >
                <Mic className="w-4 h-4 text-slate-400 hover:text-emerald-400" />
              </button>

              <button
                type="button"
                onClick={() => setInputText(prev => prev + ' 🚀')}
                className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-slate-200 transition-colors"
                title="Emojis"
              >
                <Smile className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isPrivateNote
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md disabled:opacity-40'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 disabled:opacity-40'
              }`}
            >
              <span>{isPrivateNote ? 'Guardar Nota' : 'Enviar'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
