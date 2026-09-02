import React from 'react';
import { 
  MessageSquare, 
  Kanban, 
  Bot, 
  Radio, 
  BarChart3, 
  Smartphone, 
  Sparkles, 
  CheckCircle2, 
  Layers,
  Settings,
  HelpCircle,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { ChannelConfig } from '../types';

export type ActiveView = 'inbox' | 'crm' | 'demos' | 'automations' | 'channels' | 'analytics' | 'simulator';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  channels: ChannelConfig[];
  unreadTotal: number;
  aiBotActive: boolean;
  onOpenSimulator: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  channels,
  unreadTotal,
  aiBotActive,
  onOpenSimulator
}) => {
  const navItems = [
    {
      id: 'demos' as ActiveView,
      label: 'Módulos de Negocio',
      sublabel: 'Salud & Belleza en Vivo',
      icon: Sparkles,
      badge: 'PRO',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
    },
    {
      id: 'inbox' as ActiveView,
      label: 'Bandeja Unificada',
      sublabel: 'Inbox Omnicanal',
      icon: MessageSquare,
      badge: unreadTotal > 0 ? unreadTotal : null,
      badgeColor: 'bg-emerald-500 text-slate-950 font-bold'
    },
    {
      id: 'crm' as ActiveView,
      label: 'Embudo & Leads',
      sublabel: 'CRM de Ventas',
      icon: Kanban,
      badge: null
    },
    {
      id: 'automations' as ActiveView,
      label: 'Automatizaciones',
      sublabel: 'Bot IA & Reglas',
      icon: Bot,
      badge: 'IA',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
    },
    {
      id: 'channels' as ActiveView,
      label: 'Canales & Green-API',
      sublabel: 'WhatsApp +51 986 150 562',
      icon: Radio,
      badge: `${channels.filter(c => c.status === 'connected').length}/${channels.length}`,
      badgeColor: 'bg-slate-800 text-slate-400 border border-slate-700'
    },
    {
      id: 'analytics' as ActiveView,
      label: 'Métricas & Reportes',
      sublabel: 'KPIs y Desvío IA',
      icon: BarChart3,
      badge: null
    }
  ];

  return (
    <aside className="w-64 bg-slate-900/95 backdrop-blur border-r border-slate-800 flex flex-col flex-shrink-0 select-none z-20">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-indigo-400/30">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-base tracking-tight text-white font-['Outfit']">OmniFlow</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                AI
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium truncate">Inbox Omnicanal & CRM</p>
          </div>
        </div>

        {/* Live Bot AI Status Pill */}
        <div className="mt-3 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className={`flex h-2.5 w-2.5 rounded-full ${aiBotActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {aiBotActive && (
                <span className="animate-ping absolute -top-0.5 -left-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 opacity-75" />
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-200 leading-none">
                {aiBotActive ? 'OmniBot IA 24/7' : 'Modo Manual'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {aiBotActive ? 'Gemini 3.7 Autónomo' : 'Agentes Humanos'}
              </p>
            </div>
          </div>
          <Cpu className={`w-4 h-4 ${aiBotActive ? 'text-emerald-400' : 'text-slate-500'}`} />
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Módulos Principales
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left group ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-colors ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                }`} />
                <div className="leading-tight">
                  <div className="text-[13px]">{item.label}</div>
                  <div className={`text-[10px] ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {item.sublabel}
                  </div>
                </div>
              </div>
              {item.badge && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Live Simulator Special Button */}
        <div className="pt-3">
          <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Herramienta de Pruebas
          </div>
          <button
            onClick={onOpenSimulator}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-emerald-400 animate-pulse" />
              <div>
                <div className="text-[13px] font-semibold flex items-center gap-1.5">
                  Probador en Vivo
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1 py-0.2 rounded font-bold">
                    TEST
                  </span>
                </div>
                <div className="text-[10px] text-emerald-400/80">Simular chats de clientes</div>
              </div>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>

        {/* Channels Quick Status List */}
        <div className="pt-4">
          <div className="px-3 pb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>Redes Conectadas</span>
            <span className="text-emerald-400 font-semibold lowercase text-[10px]">6 activas</span>
          </div>
          <div className="space-y-1">
            {channels.map((chan) => (
              <div
                key={chan.id}
                onClick={() => setActiveView('channels')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950/40 hover:bg-slate-800/60 border border-slate-800/60 flex items-center justify-between cursor-pointer text-xs text-slate-300 group transition-all"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: chan.color }}
                  />
                  <span className="truncate text-[11px] font-medium group-hover:text-white">
                    {chan.name}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                  {chan.messagesCount} msgs
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Footer / Agent info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-indigo-500/40 bg-slate-900 flex-shrink-0 shadow-md shadow-indigo-950 flex items-center justify-center">
              <img 
                src="/digital_myk_logo.jpg" 
                alt="Digital MYK Lab" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="leading-tight truncate">
              <p className="text-xs font-bold text-white truncate">Digital MYK Lab</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Agente Principal
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
