import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Bot, 
  User, 
  Flame, 
  Clock, 
  CheckCheck, 
  Sparkles,
  Plus,
  ArrowUpDown
} from 'lucide-react';
import { Conversation, ChannelType, ConversationStatus } from '../types';
import { getChannelMeta, getSentimentMeta, getDealStageColor } from '../utils/channelUtils';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string;
  onSelect: (id: string) => void;
  onNewConversationClick: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelect,
  onNewConversationClick
}) => {
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ConversationStatus | 'all'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'score' | 'priority'>('recent');

  const channelFilters: { id: ChannelType | 'all'; label: string; icon?: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'whatsapp', label: 'WhatsApp', icon: '🟢' },
    { id: 'instagram', label: 'Instagram', icon: '📸' },
    { id: 'messenger', label: 'Messenger', icon: '⚡' },
    { id: 'telegram', label: 'Telegram', icon: '✈️' },
    { id: 'webchat', label: 'WebChat', icon: '💬' }
  ];

  // Filtering
  const filteredConversations = conversations.filter(conv => {
    // Channel filter
    if (selectedChannel !== 'all' && conv.channel !== selectedChannel) return false;
    // Status filter
    if (selectedStatus !== 'all' && conv.status !== selectedStatus) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = conv.contactName.toLowerCase().includes(q);
      const matchPhone = conv.contactHandleOrPhone.toLowerCase().includes(q);
      const matchMsg = conv.lastMessage.toLowerCase().includes(q);
      const matchTags = conv.tags.some(t => t.toLowerCase().includes(q));
      if (!matchName && !matchPhone && !matchMsg && !matchTags) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'score') return b.leadScore - a.leadScore;
    if (sortBy === 'priority') {
      const pMap = { high: 3, medium: 2, low: 1 };
      return pMap[b.priority] - pMap[a.priority];
    }
    return 0; // default recent
  });

  const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="w-96 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 h-full select-none">
      {/* Top Header */}
      <div className="p-3.5 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-white text-base">Conversaciones</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              {filteredConversations.length}
            </span>
          </div>
          <button
            onClick={onNewConversationClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-all"
            title="Iniciar nuevo chat o simulación"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Chat</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente, teléfono, mensaje..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
          />
        </div>

        {/* Channel Switch Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-xs">
          {channelFilters.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setSelectedChannel(ch.id)}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all text-[11px] flex items-center gap-1 ${
                selectedChannel === ch.id
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/80'
              }`}
            >
              {ch.icon && <span>{ch.icon}</span>}
              <span>{ch.label}</span>
            </button>
          ))}
        </div>

        {/* Status Tabs */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
          <div className="flex items-center gap-1 bg-slate-950/60 p-0.5 rounded-lg border border-slate-800">
            {(['open', 'pending', 'resolved', 'all'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded-md transition-all font-medium capitalize ${
                  selectedStatus === st
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'open' ? 'Abiertos' : st === 'pending' ? 'En Espera' : st === 'resolved' ? 'Resueltos' : 'Todos'}
              </button>
            ))}
          </div>

          {/* Sort Menu */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-400 text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
          >
            <option value="recent">Recientes</option>
            <option value="score">Lead Score</option>
            <option value="priority">Prioridad</option>
          </select>
        </div>
      </div>

      {/* Conversation Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <Filter className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
            <p className="text-xs font-medium">No se encontraron conversaciones con este filtro.</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = conv.id === selectedId;
            const channelMeta = getChannelMeta(conv.channel);
            const sentimentMeta = getSentimentMeta(conv.sentiment);
            const stageStyle = getDealStageColor(conv.dealStage);

            return (
              <div
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`p-3 cursor-pointer transition-all relative border-l-4 group ${
                  isSelected
                    ? 'bg-slate-800/90 border-indigo-500 shadow-inner'
                    : 'hover:bg-slate-800/40 border-transparent bg-slate-900/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar with Channel Badge */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={conv.contactAvatar}
                      alt={conv.contactName}
                      className="w-11 h-11 rounded-full object-cover border border-slate-700 bg-slate-800"
                    />
                    <span
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] shadow-sm border border-slate-900"
                      style={{ backgroundColor: channelMeta.color }}
                      title={`Canal: ${channelMeta.name}`}
                    >
                      <span className="text-white font-bold">{channelMeta.iconEmoji}</span>
                    </span>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                        {conv.contactName}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono flex-shrink-0 ml-1">
                        {conv.lastMessageTime}
                      </span>
                    </div>

                    {/* Handle & Channel */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                      <span className="truncate">{conv.contactHandleOrPhone}</span>
                      {conv.botActive && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                          <Bot className="w-2.5 h-2.5" /> Bot IA
                        </span>
                      )}
                    </div>

                    {/* Last message text */}
                    <p className={`text-xs line-clamp-1 mb-2 ${
                      conv.unreadCount > 0 ? 'text-slate-100 font-semibold' : 'text-slate-400'
                    }`}>
                      {conv.lastMessage}
                    </p>

                    {/* Tags & CRM Stage Footer */}
                    <div className="flex items-center justify-between gap-1 flex-wrap text-[10px]">
                      <div className="flex items-center gap-1">
                        {/* Deal stage pill */}
                        <span className={`px-1.5 py-0.5 rounded border text-[9px] font-medium ${stageStyle}`}>
                          {conv.dealStage}
                        </span>

                        {/* Lead Score Flame */}
                        {conv.leadScore >= 75 && (
                          <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[9px] font-bold" title="Lead Caliente">
                            <Flame className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                            {conv.leadScore}
                          </span>
                        )}

                        {/* Sentiment indicator */}
                        {conv.sentiment === 'urgente' && (
                          <span className="px-1 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold animate-pulse">
                            🚨 Urgente
                          </span>
                        )}
                      </div>

                      {/* Unread badge or Deal Value */}
                      {conv.unreadCount > 0 ? (
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] flex items-center justify-center shadow">
                          {conv.unreadCount}
                        </span>
                      ) : conv.dealValue > 0 ? (
                        <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                          ${conv.dealValue.toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
