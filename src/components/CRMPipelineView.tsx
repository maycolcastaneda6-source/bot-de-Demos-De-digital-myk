import React, { useState } from 'react';
import { 
  Kanban, 
  DollarSign, 
  Flame, 
  ArrowRight, 
  MessageSquare, 
  Search, 
  Filter, 
  Plus, 
  Sparkles, 
  Building, 
  Clock, 
  CheckCircle2, 
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { Conversation, DealStage, ChannelType } from '../types';
import { getChannelMeta, getSentimentMeta, getDealStageColor } from '../utils/channelUtils';

interface CRMPipelineViewProps {
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
  onUpdateDealStage: (id: string, stage: DealStage) => void;
  onOpenNewLeadModal: () => void;
}

export const CRMPipelineView: React.FC<CRMPipelineViewProps> = ({
  conversations,
  onSelectConversation,
  onUpdateDealStage,
  onOpenNewLeadModal
}) => {
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const stages: { stage: DealStage; label: string; headerColor: string }[] = [
    { stage: 'Prospecto', label: '1. Prospectos', headerColor: 'border-slate-600 bg-slate-800/40 text-slate-300' },
    { stage: 'Calificado', label: '2. Calificados / Interesados', headerColor: 'border-blue-500 bg-blue-500/10 text-blue-300' },
    { stage: 'Propuesta', label: '3. Propuesta Enviada', headerColor: 'border-purple-500 bg-purple-500/10 text-purple-300' },
    { stage: 'Negociación', label: '4. Negociación', headerColor: 'border-amber-500 bg-amber-500/10 text-amber-300' },
    { stage: 'Cerrado Ganado', label: '5. Cerrados Ganados', headerColor: 'border-emerald-500 bg-emerald-500/10 text-emerald-300' },
    { stage: 'Soporte', label: '6. Soporte / Post-Venta', headerColor: 'border-rose-500 bg-rose-500/10 text-rose-300' }
  ];

  // Filtering
  const filtered = conversations.filter(c => {
    if (selectedChannel !== 'all' && c.channel !== selectedChannel) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.contactName.toLowerCase().includes(q) ||
        (c.contactCompany && c.contactCompany.toLowerCase().includes(q)) ||
        c.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalPipelineValue = filtered.reduce((sum, c) => sum + (c.dealValue || 0), 0);
  const wonPipelineValue = filtered
    .filter(c => c.dealStage === 'Cerrado Ganado')
    .reduce((sum, c) => sum + (c.dealValue || 0), 0);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 h-full overflow-hidden">
      {/* Top Header & Metrics Banner */}
      <div className="p-5 bg-slate-900 border-b border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Kanban className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-extrabold text-white font-['Outfit']">
                Embudo Comercial & CRM Omnicanal
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Gestiona el ciclo de vida de clientes y leads captados desde WhatsApp, Instagram, Messenger y redes sociales.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Total Pipeline Metric Card */}
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 block font-medium">Pipeline Total</span>
              <span className="text-sm font-bold font-mono text-emerald-400">
                ${totalPipelineValue.toLocaleString()} USD
              </span>
            </div>

            {/* Won Metric Card */}
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-right">
              <span className="text-[10px] text-emerald-300 block font-medium">Cerrados Ganados</span>
              <span className="text-sm font-bold font-mono text-emerald-400">
                ${wonPipelineValue.toLocaleString()} USD
              </span>
            </div>

            <button
              onClick={onOpenNewLeadModal}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Lead Manual</span>
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {(['all', 'whatsapp', 'instagram', 'messenger', 'telegram', 'webchat'] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setSelectedChannel(ch)}
                className={`px-3 py-1.5 rounded-xl font-semibold capitalize transition-all ${
                  selectedChannel === ch
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {ch === 'all' ? 'Todos los Canales' : ch}
              </button>
            ))}
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente o empresa..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Kanban Board Columns Stream */}
      <div className="flex-1 overflow-x-auto p-5">
        <div className="flex gap-4 h-full min-w-max">
          {stages.map(({ stage, label, headerColor }) => {
            const stageDeals = filtered.filter(c => c.dealStage === stage);
            const stageTotal = stageDeals.reduce((sum, c) => sum + (c.dealValue || 0), 0);

            return (
              <div
                key={stage}
                className="w-80 bg-slate-900/70 border border-slate-800/80 rounded-2xl flex flex-col h-full overflow-hidden"
              >
                {/* Column Header */}
                <div className={`p-3.5 border-b border-slate-800 flex items-center justify-between ${headerColor}`}>
                  <div>
                    <h3 className="font-bold text-xs">{label}</h3>
                    <p className="text-[11px] font-mono opacity-80 mt-0.5">
                      ${stageTotal.toLocaleString()} USD
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-950/60 font-mono font-bold">
                    {stageDeals.length}
                  </span>
                </div>

                {/* Column Cards List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {stageDeals.length === 0 ? (
                    <div className="p-6 text-center text-slate-600 text-xs border border-dashed border-slate-800 rounded-xl">
                      No hay tratos en esta etapa
                    </div>
                  ) : (
                    stageDeals.map((deal) => {
                      const channelMeta = getChannelMeta(deal.channel);
                      const sentimentMeta = getSentimentMeta(deal.sentiment);

                      return (
                        <div
                          key={deal.id}
                          className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 hover:border-indigo-500/50 hover:shadow-lg transition-all space-y-2.5 group cursor-pointer"
                          onClick={() => onSelectConversation(deal.id)}
                        >
                          {/* Card Top: Avatar & Channel & Score */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="relative">
                                <img
                                  src={deal.contactAvatar}
                                  alt={deal.contactName}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-700"
                                />
                                <span
                                  className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px]"
                                  style={{ backgroundColor: channelMeta.color }}
                                >
                                  {channelMeta.iconEmoji}
                                </span>
                              </div>
                              <div>
                                <h4 className="font-bold text-xs text-slate-100 group-hover:text-indigo-300 transition-colors">
                                  {deal.contactName}
                                </h4>
                                <p className="text-[10px] text-slate-400 truncate max-w-[130px]">
                                  {deal.contactCompany || deal.contactHandleOrPhone}
                                </p>
                              </div>
                            </div>

                            {/* Lead Score */}
                            <div className="flex items-center gap-1">
                              {deal.leadScore >= 75 ? (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[9px] font-bold">
                                  <Flame className="w-2.5 h-2.5 fill-amber-400" />
                                  {deal.leadScore}
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono text-slate-400">
                                  {deal.leadScore} pts
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Last message snippet */}
                          <p className="text-[11px] text-slate-400 line-clamp-2 italic bg-slate-900/50 p-2 rounded-lg border border-slate-800/40">
                            "{deal.lastMessage}"
                          </p>

                          {/* Tags */}
                          {deal.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {deal.tags.slice(0, 2).map((t) => (
                                <span
                                  key={t}
                                  className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 text-[9px]"
                                >
                                  {t}
                                </span>
                              ))}
                              {deal.tags.length > 2 && (
                                <span className="text-[9px] text-slate-500 self-center">
                                  +{deal.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Card Footer: Deal Value & Move Stage Button */}
                          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                            <span className="font-bold font-mono text-emerald-400 text-xs">
                              ${deal.dealValue ? deal.dealValue.toLocaleString() : '0'} <span className="text-[9px] font-normal text-slate-500">USD</span>
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectConversation(deal.id);
                                }}
                                className="p-1 text-slate-400 hover:text-white rounded bg-slate-900 border border-slate-800"
                                title="Abrir chat en vivo"
                              >
                                <MessageSquare className="w-3 h-3 text-indigo-400" />
                              </button>

                              {/* Quick Move Next Stage */}
                              {stage !== 'Soporte' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const stageOrder: DealStage[] = [
                                      'Prospecto',
                                      'Calificado',
                                      'Propuesta',
                                      'Negociación',
                                      'Cerrado Ganado',
                                      'Soporte'
                                    ];
                                    const currentIndex = stageOrder.indexOf(stage);
                                    if (currentIndex < stageOrder.length - 1) {
                                      onUpdateDealStage(deal.id, stageOrder[currentIndex + 1]);
                                    }
                                  }}
                                  className="flex items-center gap-1 px-1.5 py-1 text-[10px] font-medium text-slate-300 hover:text-indigo-300 rounded bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition-all"
                                  title="Avanzar a la siguiente etapa"
                                >
                                  <span>Mover</span>
                                  <ArrowRight className="w-2.5 h-2.5 text-indigo-400" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
