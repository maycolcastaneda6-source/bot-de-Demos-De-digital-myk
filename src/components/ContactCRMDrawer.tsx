import React, { useState } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Building, 
  Tag, 
  DollarSign, 
  Flame, 
  Sparkles, 
  Clock, 
  Edit3, 
  Check, 
  Plus, 
  FileText, 
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Conversation, DealStage } from '../types';
import { getChannelMeta, getSentimentMeta, getDealStageColor } from '../utils/channelUtils';

interface ContactCRMDrawerProps {
  conversation: Conversation;
  onClose: () => void;
  onUpdateConversation: (updated: Partial<Conversation>) => void;
  onAnalyzeWithAI: (id: string) => void;
  isAnalyzingAI: boolean;
}

export const ContactCRMDrawer: React.FC<ContactCRMDrawerProps> = ({
  conversation,
  onClose,
  onUpdateConversation,
  onAnalyzeWithAI,
  isAnalyzingAI
}) => {
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [dealValue, setDealValue] = useState(conversation.dealValue || 0);
  const [notes, setNotes] = useState(conversation.notes || '');
  const [newTag, setNewTag] = useState('');

  const channelMeta = getChannelMeta(conversation.channel);
  const sentimentMeta = getSentimentMeta(conversation.sentiment);
  const stageStyle = getDealStageColor(conversation.dealStage);

  const stages: DealStage[] = [
    'Prospecto',
    'Calificado',
    'Propuesta',
    'Negociación',
    'Cerrado Ganado',
    'Soporte'
  ];

  const handleSaveValue = () => {
    onUpdateConversation({ dealValue: Number(dealValue) });
    setIsEditingValue(false);
  };

  const handleSaveNotes = () => {
    onUpdateConversation({ notes });
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    const updatedTags = [...new Set([...conversation.tags, newTag.trim()])];
    onUpdateConversation({ tags: updatedTags });
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = conversation.tags.filter(t => t !== tagToRemove);
    onUpdateConversation({ tags: updatedTags });
  };

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-y-auto flex-shrink-0 z-20">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-indigo-400" />
          <h3 className="font-bold text-white text-sm">Ficha de Cliente & CRM</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Contact Profile Header */}
        <div className="text-center space-y-2">
          <div className="relative inline-block">
            <img
              src={conversation.contactAvatar}
              alt={conversation.contactName}
              className="w-16 h-16 rounded-full object-cover border-2 border-slate-700 mx-auto shadow-md"
            />
            <span
              className="absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] border-2 border-slate-900 shadow"
              style={{ backgroundColor: channelMeta.color }}
            >
              {channelMeta.iconEmoji}
            </span>
          </div>
          <div>
            <h4 className="font-bold text-white text-base">{conversation.contactName}</h4>
            <p className="text-xs text-slate-400">{conversation.contactCompany || 'Cliente Individual'}</p>
          </div>
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${channelMeta.badgeBg}`}>
              {channelMeta.name}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs border ${sentimentMeta.color}`}>
              {sentimentMeta.icon} {sentimentMeta.label}
            </span>
          </div>
        </div>

        {/* Lead Score & Health Gauge */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Flame className="w-4 h-4 text-amber-400" />
              Lead Score (Intención):
            </span>
            <span className="font-bold font-mono text-emerald-400 text-sm">
              {conversation.leadScore}/100
            </span>
          </div>

          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                conversation.leadScore >= 75
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-500'
                  : conversation.leadScore >= 45
                  ? 'bg-gradient-to-r from-blue-500 to-amber-500'
                  : 'bg-slate-600'
              }`}
              style={{ width: `${conversation.leadScore}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400">
            {conversation.leadScore >= 75
              ? '🔥 Lead Caliente con alta probabilidad de compra.'
              : conversation.leadScore >= 45
              ? '⚡ Lead Tibio en fase de investigación/comparación.'
              : '❄️ Lead Frío o consulta de soporte general.'}
          </p>
        </div>

        {/* Deal Stage Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Etapa en el Embudo de Ventas
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {stages.map((st) => (
              <button
                key={st}
                onClick={() => onUpdateConversation({ dealStage: st })}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold text-center border transition-all ${
                  conversation.dealStage === st
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Deal Value ($) */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Valor del Negocio / Trato:
            </span>
            {!isEditingValue && (
              <button
                onClick={() => setIsEditingValue(true)}
                className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold"
              >
                Editar
              </button>
            )}
          </div>

          {isEditingValue ? (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                <input
                  type="number"
                  value={dealValue}
                  onChange={(e) => setDealValue(Number(e.target.value))}
                  className="w-full pl-6 pr-2 py-1.5 bg-slate-900 border border-indigo-500 rounded-lg text-xs text-white focus:outline-none"
                  autoFocus
                />
              </div>
              <button
                onClick={handleSaveValue}
                className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-xl font-bold font-mono text-emerald-400">
              ${conversation.dealValue ? conversation.dealValue.toLocaleString() : '0'} <span className="text-xs font-normal text-slate-400">USD</span>
            </div>
          )}
        </div>

        {/* Contact Info Details */}
        <div className="space-y-2 text-xs">
          <label className="font-bold text-slate-300 uppercase tracking-wider block">
            Datos de Contacto
          </label>
          <div className="space-y-2 text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono">{conversation.contactHandleOrPhone}</span>
            </div>
            {conversation.contactEmail && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{conversation.contactEmail}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Agente: <strong>{conversation.assignedAgent}</strong></span>
            </div>
          </div>
        </div>

        {/* Tags Manager */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Etiquetas / Tags</span>
            <Tag className="w-3.5 h-3.5 text-slate-400" />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {conversation.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs"
              >
                <span>{tag}</span>
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-rose-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <form onSubmit={handleAddTag} className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Nueva etiqueta..."
              className="flex-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="p-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Commercial Notes */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-slate-300 uppercase tracking-wider">
              Notas Comerciales del Asesor
            </label>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
            placeholder="Añade observaciones comerciales, requerimientos específicos o recordatorios..."
            rows={3}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
          />
          <p className="text-[10px] text-slate-500 text-right">Se guarda automáticamente al hacer clic fuera</p>
        </div>

        {/* AI Action Trigger */}
        <button
          onClick={() => onAnalyzeWithAI(conversation.id)}
          disabled={isAnalyzingAI}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 hover:opacity-95 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
        >
          <Sparkles className={`w-4 h-4 ${isAnalyzingAI ? 'animate-spin' : ''}`} />
          <span>{isAnalyzingAI ? 'Actualizando Análisis Gemini...' : 'Recalcular Lead Score con IA'}</span>
        </button>
      </div>
    </div>
  );
};
