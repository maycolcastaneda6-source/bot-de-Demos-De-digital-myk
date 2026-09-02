import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Bot, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  Users, 
  MessageSquare, 
  Flame, 
  Smile, 
  Zap,
  Radio,
  ArrowUpRight
} from 'lucide-react';
import { Conversation, ChannelConfig } from '../types';
import { getChannelMeta } from '../utils/channelUtils';

interface AnalyticsViewProps {
  conversations: Conversation[];
  channels: ChannelConfig[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  conversations,
  channels
}) => {
  const totalMessages = channels.reduce((sum, c) => sum + c.messagesCount, 0);
  const totalPipeline = conversations.reduce((sum, c) => sum + (c.dealValue || 0), 0);
  const wonDeals = conversations.filter(c => c.dealStage === 'Cerrado Ganado');
  const wonValue = wonDeals.reduce((sum, c) => sum + (c.dealValue || 0), 0);
  const hotLeads = conversations.filter(c => c.leadScore >= 75).length;

  const channelVolumeData = [
    { name: 'WhatsApp Business', share: 45, color: '#25D366', msgs: 1428 },
    { name: 'Instagram Direct DMs', share: 28, color: '#E1306C', msgs: 894 },
    { name: 'WebChat Widget', share: 15, color: '#6366f1', msgs: 680 },
    { name: 'Facebook Messenger', share: 8, color: '#0084FF', msgs: 512 },
    { name: 'Telegram Bot', share: 4, color: '#0088cc', msgs: 340 }
  ];

  const sentimentData = [
    { label: 'Positivo / Entusiasmado', pct: 64, color: 'bg-emerald-500', count: 18 },
    { label: 'Neutral / Consultivo', pct: 24, color: 'bg-slate-500', count: 7 },
    { label: 'Negativo / Objeción', pct: 8, color: 'bg-amber-500', count: 2 },
    { label: 'Urgente / Reclamo Crítico', pct: 4, color: 'bg-rose-500', count: 1 }
  ];

  const stagesFunnel = [
    { stage: 'Prospectos', count: 12, value: '$6,800', bar: 100 },
    { stage: 'Calificados', count: 9, value: '$11,400', bar: 75 },
    { stage: 'Propuesta', count: 6, value: '$8,900', bar: 50 },
    { stage: 'Negociación', count: 4, value: '$9,200', bar: 33 },
    { stage: 'Cerrado Ganado', count: 3, value: '$7,200', bar: 25 }
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-950 h-full overflow-hidden">
      {/* Header */}
      <div className="p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-extrabold text-white font-['Outfit']">
              Métricas, KPIs & Rendimiento Omnicanal
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Analítica en tiempo real de interacciones, desvío de tickets por IA Gemini y conversión del embudo CRM.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <span>Período: <strong>Últimos 30 días</strong></span>
        </div>
      </div>

      {/* Main Analytics Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Highlight Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Mensajes Totales</span>
              <MessageSquare className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {totalMessages.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+24.5% vs mes anterior</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Tasa de Desvío IA (Deflection)</span>
              <Bot className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              68.4%
            </div>
            <p className="text-[11px] text-slate-400">
              Resueltos 100% por Gemini sin agente
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Tiempo de Primera Respuesta</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              1.2s <span className="text-xs font-normal text-slate-400">Bot / 3.8m Humano</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
              <span>⚡ 94% más rápido que benchmark</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Valor Ganado en CRM</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              ${(wonValue || 14850).toLocaleString()} USD
            </div>
            <p className="text-[11px] text-slate-400">
              Pipeline total activo: ${(totalPipeline || 34200).toLocaleString()} USD
            </p>
          </div>
        </div>

        {/* Middle Row: Channel Breakdown & Sentiment Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Channel Distribution */}
          <div className="lg:col-span-6 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-indigo-400" />
                Distribución de Tráfico por Red Social
              </h3>
              <span className="text-xs text-slate-400">Total Mensajes</span>
            </div>

            <div className="space-y-3">
              {channelVolumeData.map((item) => (
                <div key={item.name} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-mono text-slate-400">
                      <strong>{item.msgs.toLocaleString()}</strong> ({item.share}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.share}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Sentiment Breakdown */}
          <div className="lg:col-span-6 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Smile className="w-4 h-4 text-emerald-400" />
                Análisis de Sentimiento IA (CSAT 4.8/5)
              </h3>
              <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                96% Aceptación
              </span>
            </div>

            <div className="space-y-3">
              {sentimentData.map((item) => (
                <div key={item.label} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium">{item.label}</span>
                    <span className="font-mono text-slate-400">
                      <strong>{item.pct}%</strong>
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row: CRM Funnel Conversion */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Embudo de Conversión Comercial (De Chat a Cierre Ganado)
            </h3>
            <span className="text-xs text-slate-400">Tasa de Cierre: 28.5%</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {stagesFunnel.map((st, i) => (
              <div
                key={st.stage}
                className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 relative overflow-hidden"
              >
                <div className="text-xs text-slate-400 font-medium">
                  {i + 1}. {st.stage}
                </div>
                <div className="text-lg font-bold font-mono text-white">
                  {st.count} <span className="text-xs text-slate-400 font-normal">deals</span>
                </div>
                <div className="text-xs font-mono text-emerald-400 font-bold">
                  {st.value}
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-indigo-500 h-full rounded-full"
                    style={{ width: `${st.bar}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
